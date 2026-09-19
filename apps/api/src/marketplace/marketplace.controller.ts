import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceEnquiryDto } from "./dto/marketplace-enquiry.dto";
import { CustomSafariEnquiryDto } from "./dto/custom-safari-enquiry.dto";
import { DeparturesService } from "../departures/departures.service";
import { HoldSeatsDto } from "../departures/dto/hold-seats.dto";
import { ConfirmSeatBookingDto } from "../departures/dto/confirm-booking.dto";
import { ReviewsService } from "../reviews/reviews.service";

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
    private readonly reviews: ReviewsService,
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

  // Static "live" segment declared ahead of the dynamic :id route below,
  // same reasoning as the web router's departureSeatMapRoute ordering —
  // otherwise /marketplace/departures/live would be swallowed as a
  // department id lookup.
  @Get("departures/live")
  listLiveDepartures() {
    return this.marketplace.listLiveDepartures();
  }

  @Get("departures/:id")
  getDeparture(@Param("id") id: string) {
    return this.departures.getPublicDeparture(id);
  }

  @Get("departures/:id/seats")
  getSeatMap(
    @Param("id") id: string,
    @Query("holderToken") holderToken?: string,
  ) {
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

  @Get("templates/:id/reviews")
  listReviews(@Param("id") id: string) {
    return this.reviews.listPublicForTemplate(id);
  }

  @Get("organizations/:id")
  getOrganizationProfile(@Param("id") id: string) {
    return this.marketplace.getOrganizationProfile(id);
  }

  @Get("reviews/latest")
  listLatestReviews(@Query("limit") limit?: string) {
    return this.marketplace.listLatestReviews(
      limit ? Number(limit) : undefined,
    );
  }

  @Post("organizations/:id/custom-enquiry")
  enquireCustom(@Param("id") id: string, @Body() dto: CustomSafariEnquiryDto) {
    return this.marketplace.enquireCustom(id, dto);
  }
}
