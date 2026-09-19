import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { ProductsService } from "./products.service";

// Self-service editor for the org's own public profile mini-site (§7's
// operator/guide pages, MarketplaceController.getOrganizationProfile) —
// same MANAGE_CONTENT permission as toggling a template's public listing.
@Controller("products/organization/profile")
@UseGuards(JwtAuthGuard)
export class OrganizationProfileController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.products.getProfile(user.organizationId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_CONTENT)
  update(@CurrentUser() user: JwtPayload, @Body() body: { bio: string }) {
    return this.products.updateProfile(user.organizationId, body.bio);
  }
}
