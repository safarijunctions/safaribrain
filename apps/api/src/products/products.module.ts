import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { OrganizationProfileController } from "./organization-profile.controller";

@Module({
  providers: [ProductsService],
  controllers: [ProductsController, OrganizationProfileController],
  exports: [ProductsService],
})
export class ProductsModule {}
