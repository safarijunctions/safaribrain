import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { BookingsService } from "./bookings.service";
import { AddTravelerDto } from "./dto/add-traveler.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";

@Controller("bookings")
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  getForRequest(@CurrentUser() user: JwtPayload, @Query("requestId") requestId: string) {
    return this.bookings.getForRequest(user.organizationId, requestId);
  }

  @Post(":id/travelers")
  addTraveler(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: AddTravelerDto) {
    return this.bookings.addTraveler(user.organizationId, user.sub, id, dto);
  }

  @Post(":id/payments")
  recordPayment(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: RecordPaymentDto) {
    return this.bookings.recordPayment(user.organizationId, user.sub, id, dto);
  }
}
