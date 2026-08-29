import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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
      },
    };
  }
}
