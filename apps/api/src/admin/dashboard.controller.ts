import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserRole } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { DashboardService } from "./dashboard.service";

// Read-only aggregate counts, no secrets and no write path — gated by the
// ADMIN role rather than a dedicated scoped permission, unlike Integrations
// and Users management (§3's dual-control principle applies to actions with
// consequences; a summary view has none).
@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.dashboard.getOverview(user.organizationId);
  }
}
