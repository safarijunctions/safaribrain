import { BadRequestException, Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { BookingStatus } from "@safaribrain/shared";
import { BookingsService } from "./bookings.service";
import { BookingPdfService, BookingPdfInput } from "./booking-pdf.service";

// No auth guard by design, same reasoning as ProposalsController — a
// traveler opens their e-ticket/status link directly (from WhatsApp, email,
// or the PDF's QR code), no account required — §5.
@Controller("bookings/public")
export class BookingsPublicController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly pdf: BookingPdfService,
  ) {}

  @Get(":token")
  async get(@Param("token") token: string) {
    const b = await this.bookings.getByToken(token);
    return {
      status: b.status,
      currency: b.currency,
      totalPrice: b.totalPrice,
      amountPaid: b.amountPaid,
      balanceDue: Number(b.totalPrice) - Number(b.amountPaid),
      contactName: b.request.contact.fullName,
      travelers: b.travelers.map((t) => ({ fullName: t.fullName })),
      // Client-safe: date/amount/method only — internal reference notes and
      // who recorded it stay internal, same principle as hiding cost lines
      // on the proposal.
      payments: b.payments.map((p) => ({ amount: p.amount, method: p.method, createdAt: p.createdAt })),
      itinerary: b.termsSnapshot?.itinerary ?? null,
      termsMarkdown: b.termsSnapshot?.termsMarkdown ?? null,
    };
  }

  @Get(":token/receipt.pdf")
  async receipt(@Param("token") token: string, @Res() res: Response) {
    const b = await this.bookings.getByToken(token);
    const buffer = await this.pdf.renderReceipt(toPdfInput(b));
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=receipt.pdf", "Content-Length": buffer.length });
    res.send(buffer);
  }

  @Get(":token/eticket.pdf")
  async eticket(@Param("token") token: string, @Res() res: Response) {
    const b = await this.bookings.getByToken(token);
    if (b.status !== BookingStatus.PAID && b.status !== BookingStatus.ACTIVE && b.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException("The e-ticket is issued once the booking is fully paid");
    }
    const buffer = await this.pdf.renderETicket(toPdfInput(b));
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=e-ticket.pdf", "Content-Length": buffer.length });
    res.send(buffer);
  }
}

function toPdfInput(b: any): BookingPdfInput {
  return {
    ticketToken: b.ticketToken,
    status: b.status,
    currency: b.currency,
    totalPrice: b.totalPrice,
    amountPaid: b.amountPaid,
    contactName: b.request.contact.fullName,
    travelers: b.travelers.map((t: any) => ({ fullName: t.fullName })),
    payments: b.payments,
    itinerary: b.termsSnapshot?.itinerary ?? null,
  };
}
