import { Injectable, NotFoundException } from "@nestjs/common";
import { RequestStage } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateRequestDto } from "./dto/create-request.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // §10.1: "A web or WhatsApp enquiry creates one deduplicated contact/
  // request..." — dedupe by (organizationId, email) rather than creating a
  // fresh contact per enquiry.
  async createRequest(organizationId: string, actorId: string | undefined, dto: CreateRequestDto) {
    const contact = await this.prisma.contact.upsert({
      where: { organizationId_email: { organizationId, email: dto.contactEmail } },
      update: {
        fullName: dto.contactFullName,
        phone: dto.contactPhone,
        whatsapp: dto.contactWhatsapp,
        country: dto.contactCountry,
      },
      create: {
        organizationId,
        fullName: dto.contactFullName,
        email: dto.contactEmail,
        phone: dto.contactPhone,
        whatsapp: dto.contactWhatsapp,
        country: dto.contactCountry,
      },
    });

    const request = await this.prisma.enquiryRequest.create({
      data: {
        organizationId,
        contactId: contact.id,
        ownerId: actorId,
        source: dto.source,
        partySize: dto.partySize,
        budgetTier: dto.budgetTier,
        preferredStart: dto.preferredStart ? new Date(dto.preferredStart) : undefined,
        preferredEnd: dto.preferredEnd ? new Date(dto.preferredEnd) : undefined,
        interests: dto.interests ?? [],
        notes: dto.notes,
        consentGiven: true,
        tasks: {
          create: [
            {
              title: "First response to enquiry",
              dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              assigneeId: actorId,
            },
          ],
        },
        pipelineLog: { create: [{ stage: RequestStage.NEW, note: "Enquiry received" }] },
      },
      include: { contact: true, tasks: true },
    });

    await this.audit.record({
      organizationId,
      actorId,
      action: "request.create",
      entityType: "EnquiryRequest",
      entityId: request.id,
      metadata: { source: dto.source, contactId: contact.id },
    });

    return request;
  }

  listRequests(organizationId: string) {
    return this.prisma.enquiryRequest.findMany({
      where: { organizationId },
      include: { contact: true, owner: true, quotes: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRequest(organizationId: string, id: string) {
    const request = await this.prisma.enquiryRequest.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        owner: true,
        tasks: true,
        pipelineLog: { orderBy: { createdAt: "asc" } },
        quotes: { include: { versions: true, approvals: true, priceSnapshot: true, proposalLink: true } },
      },
    });
    if (!request) throw new NotFoundException("Request not found");
    return request;
  }

  async setStage(organizationId: string, id: string, actorId: string | undefined, stage: RequestStage, note?: string) {
    await this.getRequest(organizationId, id);
    const updated = await this.prisma.enquiryRequest.update({
      where: { id },
      data: { stage, pipelineLog: { create: [{ stage, note }] } },
    });
    await this.audit.record({ organizationId, actorId, action: "request.stage_change", entityType: "EnquiryRequest", entityId: id, metadata: { stage } });
    return updated;
  }

  // Support tool: reassign a stuck or orphaned enquiry to a different team
  // member — e.g. the original owner is out sick and a client is waiting.
  // Restricted to admins at the controller layer (RolesGuard).
  async setOwner(organizationId: string, id: string, actorId: string | undefined, ownerId: string | null) {
    await this.getRequest(organizationId, id);

    if (ownerId) {
      const membership = await this.prisma.membership.findFirst({ where: { userId: ownerId, organizationId } });
      if (!membership) throw new NotFoundException("That person is not a member of this organization");
    }

    const updated = await this.prisma.enquiryRequest.update({ where: { id }, data: { ownerId }, include: { owner: true } });
    await this.audit.record({ organizationId, actorId, action: "request.reassign_owner", entityType: "EnquiryRequest", entityId: id, metadata: { ownerId } });
    return updated;
  }
}
