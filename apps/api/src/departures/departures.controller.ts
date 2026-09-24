import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { DeparturesService } from "./departures.service";
import { CreateDepartureDto } from "./dto/create-departure.dto";
import { SetTradePricingDto } from "./dto/set-trade-pricing.dto";

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

// A separate controller (not nested under a tour template's own path)
// because a departure's trade pricing is addressed by the departure's own
// id — the operator already knows which departure they're editing, and
// nesting under :templateId here would only add a param this action
// never needs. Same MANAGE_CONTENT permission as opening a departure for
// retail sale — both are "what can be bought and by whom" decisions.
@Controller("departures/:departureId/trade")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_CONTENT)
export class DepartureTradeController {
  constructor(private readonly departures: DeparturesService) {}

  @Patch()
  setTradePricing(@CurrentUser() user: JwtPayload, @Param("departureId") departureId: string, @Body() dto: SetTradePricingDto) {
    return this.departures.setTradePricing(user.organizationId, departureId, dto.netPricePerSeat, dto.tradeVisible);
  }
}
