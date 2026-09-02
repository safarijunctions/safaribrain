import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { ContentService } from "./content.service";
import { UpsertPlaceDto } from "./dto/upsert-place.dto";
import { UpsertFeeRuleDto } from "./dto/upsert-fee-rule.dto";

@Controller("content/places")
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query("country") country?: string) {
    return this.content.listPlaces(user.organizationId, country);
  }

  @Get("countries")
  countries(@CurrentUser() user: JwtPayload) {
    return this.content.listCountries(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.content.getPlace(user.organizationId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_CONTENT)
  create(@CurrentUser() user: JwtPayload, @Body() dto: UpsertPlaceDto) {
    return this.content.createPlace(user.organizationId, user.sub, dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_CONTENT)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpsertPlaceDto) {
    return this.content.updatePlace(user.organizationId, user.sub, id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.content.deletePlace(user.organizationId, user.sub, id);
  }

  // Fee rules carry real money — gated by PUBLISH_FEE, separate from
  // MANAGE_CONTENT which only covers a place's descriptive metadata (§3).
  @Post(":id/fee-rules")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.PUBLISH_FEE)
  addFeeRule(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpsertFeeRuleDto) {
    return this.content.addFeeRule(user.organizationId, user.sub, id, dto);
  }

  @Patch(":id/fee-rules/:ruleId")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.PUBLISH_FEE)
  updateFeeRule(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Param("ruleId") ruleId: string, @Body() dto: UpsertFeeRuleDto) {
    return this.content.updateFeeRule(user.organizationId, user.sub, id, ruleId, dto);
  }

  @Delete(":id/fee-rules/:ruleId")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.PUBLISH_FEE)
  removeFeeRule(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Param("ruleId") ruleId: string) {
    return this.content.removeFeeRule(user.organizationId, user.sub, id, ruleId);
  }
}
