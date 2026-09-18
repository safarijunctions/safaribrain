import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { VehicleRentalsService } from "./vehicle-rentals.service";
import { UpsertRentalListingDto } from "./dto/upsert-listing.dto";
import { RequestRentalDto } from "./dto/request-rental.dto";
import { RespondRentalDto } from "./dto/respond-rental.dto";

// Owner-side: publishing/editing one of the org's own fleet vehicles as
// rentable. Same MANAGE_FLEET permission as every other fleet write —
// deciding a vehicle can be handed to another organization is at least
// as consequential as its own compliance data.
@Controller("fleet/vehicles/:vehicleId/rental-listing")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_FLEET)
export class VehicleRentalListingController {
  constructor(private readonly rentals: VehicleRentalsService) {}

  @Post()
  upsert(@CurrentUser() user: JwtPayload, @Param("vehicleId") vehicleId: string, @Body() dto: UpsertRentalListingDto) {
    return this.rentals.upsertListing(user.organizationId, user.sub, vehicleId, dto);
  }
}

// The cross-organization exchange: browsing other orgs' listings and
// requesting/responding to a rental agreement. Authenticated (a real
// trading partner), same reasoning as the Trade departures controller.
@Controller("vehicle-exchange")
@UseGuards(JwtAuthGuard)
export class VehicleExchangeController {
  constructor(private readonly rentals: VehicleRentalsService) {}

  @Get("listings")
  browse(@CurrentUser() user: JwtPayload) {
    return this.rentals.browseListings(user.organizationId);
  }

  @Get("my-listings")
  myListings(@CurrentUser() user: JwtPayload) {
    return this.rentals.listMyListings(user.organizationId);
  }

  @Post("listings/:id/requests")
  request(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: RequestRentalDto) {
    return this.rentals.requestRental(user.organizationId, id, dto);
  }

  @Patch("agreements/:id/respond")
  respond(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: RespondRentalDto) {
    return this.rentals.respond(user.organizationId, id, dto.decision);
  }

  @Get("agreements")
  myAgreements(@CurrentUser() user: JwtPayload) {
    return this.rentals.listMyAgreements(user.organizationId);
  }
}
