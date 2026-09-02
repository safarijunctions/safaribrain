import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { ProductsService } from "./products.service";

@Controller("products/tour-templates")
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.products.listTemplates(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.products.getTemplateWithLatestVersion(user.organizationId, id);
  }

  @Patch(":id/listing")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_CONTENT)
  setListed(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: { publiclyListed: boolean }) {
    return this.products.setListed(user.organizationId, user.sub, id, body.publiclyListed);
  }
}
