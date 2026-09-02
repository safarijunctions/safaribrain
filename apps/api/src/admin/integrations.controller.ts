import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { IntegrationsService } from "./integrations.service";
import { UpsertIntegrationDto } from "./dto/upsert-integration.dto";

@Controller("admin/integrations")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_INTEGRATIONS)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.integrations.list(user.organizationId);
  }

  @Post()
  upsert(@CurrentUser() user: JwtPayload, @Body() dto: UpsertIntegrationDto) {
    return this.integrations.upsert(user.organizationId, user.sub, dto);
  }

  @Patch(":id/enabled")
  setEnabled(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: { enabled: boolean }) {
    return this.integrations.setEnabled(user.organizationId, user.sub, id, body.enabled);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.integrations.remove(user.organizationId, user.sub, id);
  }
}
