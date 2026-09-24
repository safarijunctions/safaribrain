import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { TradeService } from "./trade.service";
import { HoldSeatsDto } from "../departures/dto/hold-seats.dto";
import { BookTradeSeatsDto } from "./dto/book-trade-seats.dto";

// Authenticated (any organization, whatever its OrganizationKind) but
// deliberately not gated by the retail marketplace's "public, no login"
// pattern — a trade partner is a known, authenticated business, not an
// anonymous traveler, so every route here requires a real session.
@Controller("trade")
@UseGuards(JwtAuthGuard)
export class TradeController {
  constructor(private readonly trade: TradeService) {}

  @Get("departures")
  listDepartures(@CurrentUser() user: JwtPayload) {
    return this.trade.listDepartures(user.organizationId);
  }

  @Get("departures/:id")
  getDeparture(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.trade.getDeparture(user.organizationId, id);
  }

  @Get("departures/:id/seats")
  getSeatMap(@Param("id") id: string, @Query("holderToken") holderToken?: string) {
    return this.trade.getSeatMap(id, holderToken);
  }

  @Post("departures/:id/hold")
  holdSeats(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: HoldSeatsDto) {
    return this.trade.holdSeats(user.organizationId, id, dto);
  }

  @Post("departures/:id/book")
  bookSeats(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: BookTradeSeatsDto) {
    return this.trade.bookSeats(user.organizationId, id, dto);
  }

  @Get("bookings")
  listMyBookings(@CurrentUser() user: JwtPayload) {
    return this.trade.listMyTradeBookings(user.organizationId);
  }

  @Get("organizations")
  listDirectory(@CurrentUser() user: JwtPayload) {
    return this.trade.listDirectory(user.organizationId);
  }
}
