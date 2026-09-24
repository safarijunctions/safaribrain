import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { clientSafeBreakdown, PriceBreakdownDto, QuoteStatus, RequestStage } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PricingService } from "../pricing/pricing.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ReviseQuoteDto } from "./dto/revise-quote.dto";
import { toJsonField, fromJsonField } from "../common/json-field";
import { parseQuote } from "../common/quote-json";

// Implements §7 Phase 1 gate: "enquiry → priced, approved quote → sent
// proposal → acceptance, fully audited" and §10 acceptance criteria 3-6.
//
// State machine: DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT -> ACCEPTED
//                                 |                          |
//                                 v                          v
//                        CHANGES_REQUESTED <-----------------+ (or DECLINED)
//
// A quote's price is mutable (new QuoteVersion rows) until it is ACCEPTED,
// at which point a PriceSnapshot is written once and never touched again — §1.8.
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  async createDraft(organizationId: string, actorId: string | undefined, dto: CreateQuoteDto) {
    const request = await this.prisma.enquiryRequest.findFirst({
      where: { id: dto.requestId, organizationId },
    });
    if (!request) throw new NotFoundException("Request not found");

    const template = await this.prisma.tourTemplate.findFirst({
      where: { id: dto.tourTemplateId, organizationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!template || !template.versions[0]) throw new NotFoundException("Tour template (with a version) not found");
    const templateVersionId = template.versions[0].id;

    const breakdown = await this.pricing.computeBreakdown({
      templateVersionId,
      partySize: request.partySize,
      residency: dto.residency,
      currency: dto.currency,
      extraCostLines: dto.extraCostLines,
      markupPercent: dto.markupPercent,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
      commissionPercent: dto.commissionPercent,
    });

    const quote = await this.prisma.quote.create({
      data: {
        requestId: dto.requestId,
        tourTemplateId: dto.tourTemplateId,
        templateVersionId,
        residency: dto.residency,
        currency: dto.currency,
        marginPercent: dto.markupPercent,
        status: QuoteStatus.DRAFT,
        versions: { create: [{ versionNo: 1, breakdown: toJsonField(breakdown), totalPrice: breakdown.totalClientPrice }] },
      },
      include: { versions: true },
    });

    await this.prisma.enquiryRequest.update({
      where: { id: dto.requestId },
      data: { stage: RequestStage.QUOTED, pipelineLog: { create: [{ stage: RequestStage.QUOTED, note: `Quote ${quote.id} drafted` }] } },
    });

    await this.audit.record({ organizationId, actorId, action: "quote.create", entityType: "Quote", entityId: quote.id });
    return parseQuote(quote);
  }

  async revise(organizationId: string, actorId: string | undefined, quoteId: string, dto: ReviseQuoteDto) {
    const quote = await this.getOwnedQuote(organizationId, quoteId);
    if (![QuoteStatus.DRAFT, QuoteStatus.CHANGES_REQUESTED].includes(quote.status as QuoteStatus)) {
      throw new BadRequestException(`Cannot revise a quote in status ${quote.status}`);
    }
    if (!quote.templateVersionId) throw new BadRequestException("Quote has no pinned template version");

    const request = await this.prisma.enquiryRequest.findUniqueOrThrow({ where: { id: quote.requestId } });
    const breakdown = await this.pricing.computeBreakdown({
      templateVersionId: quote.templateVersionId,
      partySize: request.partySize,
      residency: quote.residency,
      currency: quote.currency,
      extraCostLines: dto.extraCostLines,
      markupPercent: dto.markupPercent,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
      commissionPercent: dto.commissionPercent,
    });

    const nextVersionNo = Math.max(...quote.versions.map((v) => v.versionNo)) + 1;
    await this.prisma.quoteVersion.create({
      data: { quoteId, versionNo: nextVersionNo, breakdown: toJsonField(breakdown), totalPrice: breakdown.totalClientPrice },
    });
    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.DRAFT, marginPercent: dto.markupPercent },
      include: { versions: { orderBy: { versionNo: "desc" } } },
    });

    await this.audit.record({ organizationId, actorId, action: "quote.revise", entityType: "Quote", entityId: quoteId, metadata: { versionNo: nextVersionNo } });
    return parseQuote(updated);
  }

  async submitForApproval(organizationId: string, actorId: string | undefined, quoteId: string) {
    const quote = await this.getOwnedQuote(organizationId, quoteId);
    if (quote.status !== QuoteStatus.DRAFT) throw new BadRequestException(`Cannot submit a quote in status ${quote.status}`);

    const updated = await this.prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.PENDING_APPROVAL } });
    await this.audit.record({ organizationId, actorId, action: "quote.submit_for_approval", entityType: "Quote", entityId: quoteId });
    return updated;
  }

  // §3/§10.4: a manager approves; the approval itself is audited. Callers
  // must hold Permission.APPROVE_QUOTE (enforced by the guard on the route).
  async decide(organizationId: string, approverId: string, quoteId: string, decision: "APPROVED" | "REJECTED", reason?: string) {
    const quote = await this.getOwnedQuote(organizationId, quoteId);
    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot decide on a quote in status ${quote.status}`);
    }

    await this.prisma.approval.create({ data: { quoteId, approverId, decision, reason } });
    const nextStatus = decision === "APPROVED" ? QuoteStatus.APPROVED : QuoteStatus.CHANGES_REQUESTED;
    const updated = await this.prisma.quote.update({ where: { id: quoteId }, data: { status: nextStatus } });

    await this.audit.record({ organizationId, actorId: approverId, action: `quote.${decision.toLowerCase()}`, entityType: "Quote", entityId: quoteId, metadata: { reason } });
    return updated;
  }

  async send(organizationId: string, actorId: string | undefined, quoteId: string) {
    const quote = await this.getOwnedQuote(organizationId, quoteId);
    if (quote.status !== QuoteStatus.APPROVED) throw new BadRequestException(`Cannot send a quote in status ${quote.status}`);

    const proposalLink = await this.prisma.proposalLink.upsert({
      where: { quoteId },
      update: {},
      create: { quoteId },
    });
    await this.prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.SENT } });
    await this.prisma.enquiryRequest.update({
      where: { id: quote.requestId },
      data: { pipelineLog: { create: [{ stage: RequestStage.NEGOTIATING, note: "Proposal sent to client" }] }, stage: RequestStage.NEGOTIATING },
    });

    await this.audit.record({ organizationId, actorId, action: "quote.send", entityType: "Quote", entityId: quoteId, metadata: { proposalToken: proposalLink.token } });
    return proposalLink;
  }

  // --- Public proposal routes (no auth — §5 mobile/WhatsApp-first) ---------

  async getProposalByToken(token: string) {
    const link = await this.prisma.proposalLink.findUnique({
      where: { token },
      include: {
        quote: {
          include: {
            versions: { orderBy: { versionNo: "desc" }, take: 1 },
            request: { include: { contact: true } },
            tourTemplate: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1, include: { days: { include: { place: true }, orderBy: { dayNumber: "asc" } } } } } },
            priceSnapshot: true,
          },
        },
      },
    });
    if (!link) throw new NotFoundException("Proposal not found");

    if (!link.openedAt) {
      await this.prisma.proposalLink.update({ where: { token }, data: { openedAt: new Date() } });
    }

    // Once accepted, always serve the frozen snapshot — never the live
    // (possibly since-edited) template/quote data — §1.8.
    const breakdown = fromJsonField<PriceBreakdownDto>(
      link.quote.priceSnapshot ? link.quote.priceSnapshot.breakdown : link.quote.versions[0].breakdown,
      {} as PriceBreakdownDto,
    );

    const templateVersion = link.quote.tourTemplate?.versions[0];
    return {
      status: link.quote.status,
      contactName: link.quote.request.contact.fullName,
      itinerary: templateVersion
        ? { ...templateVersion, days: templateVersion.days.map((d) => ({ ...d, mealsIncluded: fromJsonField<string[]>(d.mealsIncluded, []) })) }
        : undefined,
      breakdown: clientSafeBreakdown(breakdown), // never leak internal cost lines to the client — §10.3
      isFrozen: Boolean(link.quote.priceSnapshot),
    };
  }

  async accept(token: string) {
    const link = await this.prisma.proposalLink.findUnique({
      where: { token },
      include: {
        quote: {
          include: {
            versions: { orderBy: { versionNo: "desc" }, take: 1 },
            request: { select: { organizationId: true } },
            tourTemplate: {
              include: {
                versions: {
                  orderBy: { versionNumber: "desc" },
                  take: 1,
                  include: { days: { include: { place: true }, orderBy: { dayNumber: "asc" } } },
                },
              },
            },
          },
        },
      },
    });
    if (!link) throw new NotFoundException("Proposal not found");
    if (link.quote.status !== QuoteStatus.SENT) throw new BadRequestException(`Cannot accept a quote in status ${link.quote.status}`);

    const latestVersion = link.quote.versions[0];
    const templateVersion = link.quote.tourTemplate?.versions[0];

    // Write-once freeze — §1.8, §6. This snapshot is what every downstream
    // system (booking, finance, guide manifest) must read from now on. A
    // Booking (with its own immutable BookingTermsSnapshot — same
    // discipline as PriceSnapshot) is created in the same transaction, so
    // acceptance always yields exactly one booking, never a dangling
    // ACCEPTED quote with nothing behind it.
    //
    // The status check above (outside the transaction) is only a
    // fast-path rejection — it can't stop two concurrent accept() calls
    // (a double-click, a client retry) from both reading SENT before
    // either commits. The real guard is this conditional updateMany as
    // the transaction's first statement: it can only ever flip exactly
    // one caller's row from SENT, so a second concurrent caller sees
    // count 0 and gets a clean "already accepted" error instead of a raw
    // unique-constraint 500 from a duplicate Booking/PriceSnapshot.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.quote.updateMany({
        where: { id: link.quoteId, status: QuoteStatus.SENT },
        data: { status: QuoteStatus.ACCEPTED },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("This proposal has already been accepted.");
      }

      await tx.priceSnapshot.create({
        data: {
          quoteId: link.quoteId,
          // Already JSON text on the QuoteVersion row — copied verbatim
          // rather than parse-then-restringify.
          breakdown: latestVersion.breakdown,
          totalPrice: latestVersion.totalPrice,
          currency: link.quote.currency,
        },
      });
      await tx.proposalLink.update({ where: { token }, data: { acceptedAt: new Date() } });
      await tx.enquiryRequest.update({
        where: { id: link.quote.requestId },
        data: { stage: RequestStage.BOOKED, pipelineLog: { create: [{ stage: RequestStage.BOOKED, note: "Client accepted proposal" }] } },
      });
      await tx.booking.create({
        data: {
          organizationId: link.quote.request.organizationId,
          requestId: link.quote.requestId,
          quoteId: link.quoteId,
          currency: link.quote.currency,
          totalPrice: latestVersion.totalPrice,
          termsSnapshot: {
            create: {
              itinerary: toJsonField({
                title: link.quote.tourTemplate?.title ?? null,
                durationDays: link.quote.tourTemplate?.durationDays ?? null,
                days: templateVersion?.days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  description: d.description,
                  mealsIncluded: fromJsonField<string[]>(d.mealsIncluded, []),
                  place: d.place ? { name: d.place.name } : null,
                })) ?? [],
              }),
              termsMarkdown: templateVersion?.termsMarkdown ?? null,
            },
          },
        },
      });
    });

    await this.audit.record({
      organizationId: link.quote.request.organizationId,
      action: "quote.accept",
      entityType: "Quote",
      entityId: link.quoteId,
      metadata: { token },
    });
    return { accepted: true };
  }

  async requestChanges(token: string, note?: string) {
    const link = await this.prisma.proposalLink.findUnique({
      where: { token },
      include: { quote: { include: { request: { select: { organizationId: true } } } } },
    });
    if (!link) throw new NotFoundException("Proposal not found");
    if (link.quote.status !== QuoteStatus.SENT) throw new BadRequestException(`Cannot request changes on a quote in status ${link.quote.status}`);

    // Same concurrent-request guard as accept() — a conditional updateMany
    // so two simultaneous "request changes" clicks can't both proceed.
    const claimed = await this.prisma.quote.updateMany({
      where: { id: link.quoteId, status: QuoteStatus.SENT },
      data: { status: QuoteStatus.CHANGES_REQUESTED },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException("This proposal has already been actioned.");
    }
    await this.prisma.enquiryRequest.update({
      where: { id: link.quote.requestId },
      data: { stage: RequestStage.NEGOTIATING, pipelineLog: { create: [{ stage: RequestStage.NEGOTIATING, note: note ?? "Client requested changes" }] } },
    });
    await this.audit.record({
      organizationId: link.quote.request.organizationId,
      action: "quote.changes_requested",
      entityType: "Quote",
      entityId: link.quoteId,
      metadata: { note },
    });
    return { requested: true };
  }

  private async getOwnedQuote(organizationId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, request: { organizationId } },
      include: { versions: { orderBy: { versionNo: "asc" } } },
    });
    if (!quote) throw new NotFoundException("Quote not found");
    return quote;
  }
}
