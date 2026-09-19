import { Injectable, NotFoundException } from "@nestjs/common";
import { LeadSourceChannel } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";
import { MarketplaceEnquiryDto } from "./dto/marketplace-enquiry.dto";
import { CustomSafariEnquiryDto } from "./dto/custom-safari-enquiry.dto";
import { fromJsonField } from "../common/json-field";

// Phase 3 (§7) marketplace — public, cross-organization browsing. Every
// query here is scoped to publiclyListed=true templates belonging to a
// verified org (Organization.verified, the "trust domain" collapsed onto
// the org in Phase 0/1 — §6) rather than organizationId, the opposite of
// every other service in this codebase, which is exactly why this lives in
// its own module instead of extending ProductsService.
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmService,
  ) {}

  listTemplates(country?: string) {
    return this.prisma.tourTemplate.findMany({
      where: {
        publiclyListed: true,
        organization: { verified: true, ...(country ? { country } : {}) },
      },
      include: {
        organization: { select: { id: true, name: true, country: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
      orderBy: { title: "asc" },
    });
  }

  // Cross-template "departing soon" feed for the homepage's Live Joining
  // Safaris strip — the per-template departures endpoints
  // (DeparturesService.listPublicForTemplate) only ever look at one
  // template at a time, which is right for a listing page but can't
  // power a homepage feed spanning every operator's inventory. Same
  // trust-domain scoping as everything else in this service (publicly
  // listed + verified org), plus OPEN status and a future departure date.
  async listLiveDepartures(limit = 12) {
    const departures = await this.prisma.departure.findMany({
      where: {
        status: "OPEN",
        departureDate: { gte: new Date() },
        tourTemplate: {
          publiclyListed: true,
          organization: { verified: true },
        },
      },
      include: {
        tourTemplate: {
          select: {
            title: true,
            durationDays: true,
            organization: { select: { id: true, name: true, country: true } },
          },
        },
        seats: { select: { status: true, heldUntil: true } },
      },
      orderBy: { departureDate: "asc" },
      take: limit,
    });

    const now = new Date();
    return departures.map((d) => {
      const booked = d.seats.filter(
        (s) =>
          s.status === "BOOKED" ||
          (s.status === "HELD" && s.heldUntil && s.heldUntil > now),
      ).length;
      const available = d.totalSeats - booked;
      return {
        id: d.id,
        departureDate: d.departureDate,
        currency: d.currency,
        pricePerSeat: d.pricePerSeat,
        totalSeats: d.totalSeats,
        seatsAvailable: available,
        tourTemplate: d.tourTemplate,
      };
    });
  }

  // The homepage "Live Africa" feed — real traveler reviews just approved
  // across every verified operator/guide, not curated filler. Same trust-
  // domain scoping as everything else in this service.
  listLatestReviews(limit = 8) {
    return this.prisma.review.findMany({
      where: { status: "APPROVED", organization: { verified: true } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        organization: { select: { id: true, name: true, country: true } },
        tourTemplate: { select: { id: true, title: true } },
      },
    });
  }

  // The operator/guide public profile mini-site (§7) — everything a
  // traveler needs to trust the org behind a listing before enquiring:
  // who they are, their own words, and every publicly listed template
  // plus approved reviews. Same trust-domain scoping as the rest of this
  // service (verified org only).
  async getOrganizationProfile(id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id, verified: true },
      select: {
        id: true,
        name: true,
        kind: true,
        country: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!organization) throw new NotFoundException("Operator not found");

    const [templates, reviews] = await Promise.all([
      this.prisma.tourTemplate.findMany({
        where: { organizationId: id, publiclyListed: true },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { title: "asc" },
      }),
      this.prisma.review.findMany({
        where: { organizationId: id, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          reviewerName: true,
          rating: true,
          title: true,
          body: true,
          operatorReply: true,
          createdAt: true,
        },
      }),
    ]);

    const averageRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    return {
      organization,
      templates,
      reviews,
      averageRating,
      reviewCount: reviews.length,
    };
  }

  async getTemplate(id: string) {
    const template = await this.prisma.tourTemplate.findFirst({
      where: { id, publiclyListed: true, organization: { verified: true } },
      include: {
        organization: { select: { id: true, name: true, country: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            days: { include: { place: true }, orderBy: { dayNumber: "asc" } },
          },
        },
      },
    });
    if (!template) throw new NotFoundException("Listing not found");
    return {
      ...template,
      versions: template.versions.map((v) => ({
        ...v,
        days: v.days.map((d) => ({
          ...d,
          mealsIncluded: fromJsonField<string[]>(d.mealsIncluded, []),
        })),
      })),
    };
  }

  // Routes straight into the same CrmService the operator's "new enquiry"
  // form uses (§10.1 dedup-by-email) — a marketplace enquiry is not a
  // second-class enquiry, it lands in the exact same pipeline an operator
  // works from. No actor (anonymous), so ownerId stays unassigned.
  async enquire(templateId: string, dto: MarketplaceEnquiryDto) {
    const template = await this.prisma.tourTemplate.findFirst({
      where: {
        id: templateId,
        publiclyListed: true,
        organization: { verified: true },
      },
    });
    if (!template) throw new NotFoundException("Listing not found");

    const notes = `Enquired via marketplace listing "${template.title}".${dto.notes ? `\n\n${dto.notes}` : ""}`;

    return this.crm.createRequest(template.organizationId, undefined, {
      contactFullName: dto.contactFullName,
      contactEmail: dto.contactEmail,
      contactWhatsapp: dto.contactWhatsapp,
      contactCountry: dto.contactCountry,
      source: LeadSourceChannel.WEB,
      partySize: dto.partySize,
      preferredStart: dto.preferredStart,
      notes,
      interests: [template.title],
    });
  }

  // The custom-safari conversational builder's landing point — no
  // TourTemplate involved (that's the whole point: the traveler hasn't
  // picked one), just a verified org the conversation matched by country.
  // Routes into the exact same CRM pipeline as every other enquiry source.
  async enquireCustom(organizationId: string, dto: CustomSafariEnquiryDto) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, verified: true },
    });
    if (!organization) throw new NotFoundException("Operator not found");

    const notes = `Custom safari request via the conversational trip builder.${dto.notes ? `\n\n${dto.notes}` : ""}`;

    return this.crm.createRequest(organizationId, undefined, {
      contactFullName: dto.contactFullName,
      contactEmail: dto.contactEmail,
      contactWhatsapp: dto.contactWhatsapp,
      contactCountry: dto.contactCountry,
      source: LeadSourceChannel.WEB,
      partySize: dto.partySize,
      preferredStart: dto.preferredStart,
      budgetTier: dto.budgetTier,
      notes,
      interests: dto.interests ?? [],
    });
  }
}
