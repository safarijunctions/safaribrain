import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InviteUserDto } from "./dto/invite-user.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";

// Admin Portal user management (§4.9). Real invite email delivery needs a
// messaging integration (see IntegrationsService) — until an admin sets one
// up, invites are surfaced as a one-time temporary password the admin
// shares out of band, rather than left half-built waiting on that decision.
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async invite(organizationId: string, actorId: string | undefined, dto: InviteUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId } },
      });
      if (existingMembership) throw new BadRequestException("This person already has access to your organization");

      const membership = await this.prisma.membership.create({
        data: { userId: existingUser.id, organizationId, role: dto.role, permissions: dto.permissions ?? [] },
      });
      await this.audit.record({ actorId, action: "user.add_to_org", entityType: "Membership", entityId: membership.id, metadata: { role: dto.role } });
      const { passwordHash: _existingHash, ...safeExistingUser } = existingUser;
      return { user: safeExistingUser, membership, tempPassword: null };
    }

    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        memberships: { create: { organizationId, role: dto.role, permissions: dto.permissions ?? [] } },
      },
      include: { memberships: true },
    });

    await this.audit.record({ actorId, action: "user.invite", entityType: "User", entityId: user.id, metadata: { role: dto.role } });

    // Returned once, at creation, so the admin can share it — never
    // retrievable again afterwards. The password hash never leaves the server.
    const { passwordHash: _hash, ...safeUser } = user;
    return { user: safeUser, membership: user.memberships[0], tempPassword };
  }

  async updateMembership(organizationId: string, actorId: string | undefined, membershipId: string, dto: UpdateMembershipDto) {
    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!membership) throw new NotFoundException("Membership not found");

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role, permissions: dto.permissions },
    });
    await this.audit.record({ actorId, action: "user.update_membership", entityType: "Membership", entityId: membershipId, metadata: { ...dto } });
    return updated;
  }

  async removeMembership(organizationId: string, actorId: string | undefined, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!membership) throw new NotFoundException("Membership not found");

    await this.prisma.membership.delete({ where: { id: membershipId } });
    await this.audit.record({ actorId, action: "user.remove_membership", entityType: "Membership", entityId: membershipId });
    return { removed: true };
  }
}
