import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Org-to-org messaging (§6 Trade "chat... knowing each other") — an
// operator, guide, agent, or vehicle owner messaging another organization
// they trade with. Deliberately not traveler-facing: travelers hold no
// platform account anywhere in this system (public tokenized links only),
// so a traveler-facing "safari group chat" would need a traveler identity
// model built first — see ARCHITECTURE.md.
@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateConversation(orgId: string, counterpartOrgId: string) {
    if (orgId === counterpartOrgId) throw new BadRequestException("You can't start a conversation with your own organization");

    const counterpart = await this.prisma.organization.findUnique({ where: { id: counterpartOrgId } });
    if (!counterpart) throw new NotFoundException("Organization not found");

    // Normalize the pair so (A, B) and (B, A) always resolve to the same
    // row — makes "start a conversation" idempotent instead of creating a
    // duplicate thread every time either side re-opens it.
    const [organizationAId, organizationBId] = [orgId, counterpartOrgId].sort();

    return this.prisma.conversation.upsert({
      where: { organizationAId_organizationBId: { organizationAId, organizationBId } },
      update: {},
      create: { organizationAId, organizationBId },
    });
  }

  private async assertParticipant(orgId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (conversation.organizationAId !== orgId && conversation.organizationBId !== orgId) {
      throw new ForbiddenException("Not a participant in this conversation");
    }
    return conversation;
  }

  async startConversation(orgId: string, actorId: string | undefined, counterpartOrgId: string, body: string) {
    const conversation = await this.findOrCreateConversation(orgId, counterpartOrgId);
    await this.prisma.message.create({
      data: { conversationId: conversation.id, senderOrganizationId: orgId, senderUserId: actorId, body },
    });
    return conversation;
  }

  async listConversations(orgId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ organizationAId: orgId }, { organizationBId: orgId }] },
      include: {
        organizationA: { select: { id: true, name: true, kind: true } },
        organizationB: { select: { id: true, name: true, kind: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return conversations.map((c) => ({
      id: c.id,
      counterpart: c.organizationAId === orgId ? c.organizationB : c.organizationA,
      lastMessage: c.messages[0] ?? null,
    }));
  }

  async listMessages(orgId: string, conversationId: string) {
    await this.assertParticipant(orgId, conversationId);
    return this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  }

  async sendMessage(orgId: string, actorId: string | undefined, conversationId: string, body: string) {
    await this.assertParticipant(orgId, conversationId);
    return this.prisma.message.create({
      data: { conversationId, senderOrganizationId: orgId, senderUserId: actorId, body },
    });
  }
}
