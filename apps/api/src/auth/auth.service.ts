import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Permission, UserRole } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Self-service sign-up (§6 Trade) — the org this creates starts
  // unverified, the same trust gate MarketplaceService/TradeService already
  // require before a listing or trade departure is visible to anyone else.
  // The registering person becomes their new org's sole ADMIN member with
  // every permission, same shape the seed script gives the first user of
  // an org — they own it, there's no one else yet to divide control with.
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("An account with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          kind: dto.organizationKind,
          country: dto.country,
          currency: dto.currency,
          verified: false,
        },
      });
      await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          memberships: {
            create: { organizationId: organization.id, role: UserRole.ADMIN, permissions: Object.values(Permission) },
          },
        },
      });
    });

    return this.login(dto.email, dto.password);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    // Phase 1 scope: one active membership per user. Multi-org switching is
    // a later refinement once the Trade/Agent module needs it (§4.10).
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException("User has no organization membership");

    return { user, membership };
  }

  async login(email: string, password: string) {
    const { user, membership } = await this.validateUser(email, password);

    const payload = {
      sub: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      permissions: membership.permissions,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL ?? "7d",
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: membership.role,
        permissions: membership.permissions,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        organizationKind: membership.organization.kind,
        organizationVerified: membership.organization.verified,
      },
    };
  }
}
