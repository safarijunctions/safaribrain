import { Injectable, NotFoundException } from "@nestjs/common";
import { LeadSourceChannel } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";
import { MarketplaceEnquiryDto } from "./dto/marketplace-enquiry.dto";

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
        organization: { select: { name: true, country: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
      orderBy: { title: "asc" },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.tourTemplate.findFirst({
      where: { id, publiclyListed: true, organization: { verified: true } },
      include: {
        organization: { select: { name: true, country: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { days: { include: { place: true }, orderBy: { dayNumber: "asc" } } },
        },
      },
    });
    if (!template) throw new NotFoundException("Listing not found");
    return template;
  }

  // Routes straight into the same CrmService the operator's "new enquiry"
  // form uses (§10.1 dedup-by-email) — a marketplace enquiry is not a
  // second-class enquiry, it lands in the exact same pipeline an operator
  // works from. No actor (anonymous), so ownerId stays unassigned.
  async enquire(templateId: string, dto: MarketplaceEnquiryDto) {
    const template = await this.prisma.tourTemplate.findFirst({
      where: { id: templateId, publiclyListed: true, organization: { verified: true } },
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
}
