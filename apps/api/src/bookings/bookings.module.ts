import { Module } from "@nestjs/common";
import { ReviewsModule } from "../reviews/reviews.module";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { BookingsPublicController } from "./bookings-public.controller";
import { BookingPdfService } from "./booking-pdf.service";

@Module({
  imports: [ReviewsModule],
  providers: [BookingsService, BookingPdfService],
  controllers: [BookingsController, BookingsPublicController],
  exports: [BookingsService],
})
export class BookingsModule {}
