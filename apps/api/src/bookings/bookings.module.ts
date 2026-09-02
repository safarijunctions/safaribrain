import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { BookingsPublicController } from "./bookings-public.controller";
import { BookingPdfService } from "./booking-pdf.service";

@Module({
  providers: [BookingsService, BookingPdfService],
  controllers: [BookingsController, BookingsPublicController],
  exports: [BookingsService],
})
export class BookingsModule {}
