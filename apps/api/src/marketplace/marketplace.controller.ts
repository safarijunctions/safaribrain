import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceEnquiryDto } from "./dto/marketplace-enquiry.dto";
import { DeparturesService } from "../departures/departures.service";
import { HoldSeatsDto } from "../departures/dto/hold-seats.dto";
import { ConfirmSeatBookingDto } from "../departures/dto/confirm-booking.dto";

// No auth guard by design, same reasoning as ProposalsController/
// BookingsPublicController — a prospective traveler browses without an
// account, per §5 "mobile, low-bandwidth, WhatsApp-first" and §7's
// marketplace phase. The departure/seat-map endpoints below are §1.2's
// second buying mode (instant booking) living on the same public surface
// as the quote-request flow above it.
@Controller("marketplace")
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly departures: DeparturesService,
  ) {}

  @Get("templates")
  list(@Query("country") country?: string) {
    return this.marketplace.listTemplates(country);
  }

  @Get("templates/:id")
  get(@Param("id") id: string) {
    return this.marketplace.getTemplate(id);
  }

  @Post("templates/:id/enquire")
  enquire(@Param("id") id: string, @Body() dto: MarketplaceEnquiryDto) {
    return this.marketplace.enquire(id, dto);
  }

  @Get("templates/:id/departures")
  listDepartures(@Param("id") id: string) {
    return this.departures.listPublicForTemplate(id);
  }

  @Get("departures/:id")
  getDeparture(@Param("id") id: string) {
    return this.departures.getPublicDeparture(id);
  }

  @Get("departures/:id/seats")
  getSeatMap(@Param("id") id: string, @Query("holderToken") holderToken?: string) {
    return this.departures.getSeatMap(id, holderToken);
  }

  @Post("departures/:id/hold")
  holdSeats(@Param("id") id: string, @Body() dto: HoldSeatsDto) {
    return this.departures.holdSeats(id, dto);
  }

  @Post("departures/:id/book")
  confirmBooking(@Param("id") id: string, @Body() dto: ConfirmSeatBookingDto) {
    return this.departures.confirmBooking(id, dto);
  }
}
