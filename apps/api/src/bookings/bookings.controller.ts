import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { BookingsService } from "./bookings.service";
import { BookingPdfService, BookingPdfInput } from "./booking-pdf.service";
import { AddTravelerDto } from "./dto/add-traveler.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { UpdateLogisticsDto } from "./dto/update-logistics.dto";

@Controller("bookings")
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly pdf: BookingPdfService,
  ) {}

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

  @Patch(":id/logistics")
  updateLogistics(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateLogisticsDto) {
    return this.bookings.updateLogistics(user.organizationId, user.sub, id, dto);
  }

  // Staff-only, deliberately not on BookingsPublicController — carries
  // passport numbers and dates of birth for park-entry logs, which the
  // client-facing side never sees.
  @Get(":id/manifest.pdf")
  async manifest(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Res() res: Response) {
    const b = await this.bookings.getOwned(user.organizationId, id);
    const buffer = await this.pdf.renderManifest(toManifestPdfInput(b));
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=guide-manifest.pdf", "Content-Length": buffer.length });
    res.send(buffer);
  }
}

function toManifestPdfInput(b: any): BookingPdfInput {
  return {
    ticketToken: b.ticketToken,
    status: b.status,
    currency: b.currency,
    totalPrice: b.totalPrice,
    amountPaid: b.amountPaid,
    contactName: b.request.contact.fullName,
    contactWhatsapp: b.request.contact.whatsapp,
    travelers: b.travelers,
    payments: b.payments,
    itinerary: b.termsSnapshot?.itinerary ?? null,
    guideName: b.guideName,
    guidePhone: b.guidePhone,
    pickupNotes: b.pickupNotes,
  };
}
