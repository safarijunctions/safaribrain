import { Module } from "@nestjs/common";
import { VehicleRentalsService } from "./vehicle-rentals.service";
import { VehicleRentalListingController, VehicleExchangeController } from "./vehicle-rentals.controller";

@Module({
  providers: [VehicleRentalsService],
  controllers: [VehicleRentalListingController, VehicleExchangeController],
})
export class VehicleRentalsModule {}
