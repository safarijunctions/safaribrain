import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { DeparturesService } from "./departures.service";
import { CreateDepartureDto } from "./dto/create-departure.dto";

// Staff-side: opening a departure for sale. Gated by MANAGE_CONTENT, same
// permission as the marketplace-listing toggle — both are "what a
// traveler can find and buy" decisions (§3).
@Controller("products/tour-templates/:templateId/departures")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_CONTENT)
export class DeparturesController {
  constructor(private readonly departures: DeparturesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param("templateId") templateId: string) {
    return this.departures.listForTemplate(user.organizationId, templateId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Param("templateId") templateId: string, @Body() dto: CreateDepartureDto) {
    return this.departures.createDeparture(user.organizationId, user.sub, templateId, dto);
  }
}
