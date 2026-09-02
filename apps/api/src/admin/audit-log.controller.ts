import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { AuditService } from "../audit/audit.service";

// Read-only visibility into everything that happened in the org — the
// point isn't compliance theater, it's giving an admin a real tool to
// answer "what happened to this quote/request/user" when someone reports
// a problem, instead of having to ask an engineer to query the database.
// ADMIN-role gated like the dashboard, not a scoped permission, since it
// has no write path of its own.
@Controller("admin/audit-log")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.audit.list(user.organizationId, {
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 25)),
      entityType,
      entityId,
    });
  }
}
