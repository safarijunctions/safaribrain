import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { clientSafeBreakdown, PriceBreakdownDto, QuoteStatus, RequestStage } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PricingService } from "../pricing/pricing.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ReviseQuoteDto } from "./dto/revise-quote.dto";

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
        versions: { create: [{ versionNo: 1, breakdown: breakdown as any, totalPrice: breakdown.totalClientPrice }] },
      },
      include: { versions: true },
    });

    await this.prisma.enquiryRequest.update({
      where: { id: dto.requestId },
      data: { stage: RequestStage.QUOTED, pipelineLog: { create: [{ stage: RequestStage.QUOTED, note: `Quote ${quote.id} drafted` }] } },
    });

    await this.audit.record({ actorId, action: "quote.create", entityType: "Quote", entityId: quote.id });
    return quote;
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
      data: { quoteId, versionNo: nextVersionNo, breakdown: breakdown as any, totalPrice: breakdown.totalClientPrice },
    });
    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.DRAFT, marginPercent: dto.markupPercent },
      include: { versions: { orderBy: { versionNo: "desc" } } },
    });

    await this.audit.record({ actorId, action: "quote.revise", entityType: "Quote", entityId: quoteId, metadata: { versionNo: nextVersionNo } });
    return updated;
  }

  async submitForApproval(organizationId: string, actorId: string | undefined, quoteId: string) {
    const quote = await this.getOwnedQuote(organizationId, quoteId);
    if (quote.status !== QuoteStatus.DRAFT) throw new BadRequestException(`Cannot submit a quote in status ${quote.status}`);

    const updated = await this.prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.PENDING_APPROVAL } });
    await this.audit.record({ actorId, action: "quote.submit_for_approval", entityType: "Quote", entityId: quoteId });
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

    await this.audit.record({ actorId: approverId, action: `quote.${decision.toLowerCase()}`, entityType: "Quote", entityId: quoteId, metadata: { reason } });
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

    await this.audit.record({ actorId, action: "quote.send", entityType: "Quote", entityId: quoteId, metadata: { proposalToken: proposalLink.token } });
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
    const breakdown = (link.quote.priceSnapshot
      ? link.quote.priceSnapshot.breakdown
      : link.quote.versions[0].breakdown) as unknown as PriceBreakdownDto;

    return {
      status: link.quote.status,
      contactName: link.quote.request.contact.fullName,
      itinerary: link.quote.tourTemplate?.versions[0],
      breakdown: clientSafeBreakdown(breakdown), // never leak internal cost lines to the client — §10.3
      isFrozen: Boolean(link.quote.priceSnapshot),
    };
  }

  async accept(token: string) {
    const link = await this.prisma.proposalLink.findUnique({ where: { token }, include: { quote: { include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } } } } });
    if (!link) throw new NotFoundException("Proposal not found");
    if (link.quote.status !== QuoteStatus.SENT) throw new BadRequestException(`Cannot accept a quote in status ${link.quote.status}`);

    const latestVersion = link.quote.versions[0];

    // Write-once freeze — §1.8, §6. This snapshot is what every downstream
    // system (booking, finance, guide manifest) must read from now on.
    await this.prisma.$transaction([
      this.prisma.priceSnapshot.create({
        data: {
          quoteId: link.quoteId,
          breakdown: latestVersion.breakdown as any,
          totalPrice: latestVersion.totalPrice,
          currency: link.quote.currency,
        },
      }),
      this.prisma.quote.update({ where: { id: link.quoteId }, data: { status: QuoteStatus.ACCEPTED } }),
      this.prisma.proposalLink.update({ where: { token }, data: { acceptedAt: new Date() } }),
      this.prisma.enquiryRequest.update({
        where: { id: link.quote.requestId },
        data: { stage: RequestStage.BOOKED, pipelineLog: { create: [{ stage: RequestStage.BOOKED, note: "Client accepted proposal" }] } },
      }),
    ]);

    await this.audit.record({ action: "quote.accept", entityType: "Quote", entityId: link.quoteId, metadata: { token } });
    return { accepted: true };
  }

  async requestChanges(token: string, note?: string) {
    const link = await this.prisma.proposalLink.findUnique({ where: { token }, include: { quote: true } });
    if (!link) throw new NotFoundException("Proposal not found");
    if (link.quote.status !== QuoteStatus.SENT) throw new BadRequestException(`Cannot request changes on a quote in status ${link.quote.status}`);

    await this.prisma.quote.update({ where: { id: link.quoteId }, data: { status: QuoteStatus.CHANGES_REQUESTED } });
    await this.prisma.enquiryRequest.update({
      where: { id: link.quote.requestId },
      data: { stage: RequestStage.NEGOTIATING, pipelineLog: { create: [{ stage: RequestStage.NEGOTIATING, note: note ?? "Client requested changes" }] } },
    });
    await this.audit.record({ action: "quote.changes_requested", entityType: "Quote", entityId: link.quoteId, metadata: { note } });
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
