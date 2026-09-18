import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CrmModule } from "./crm/crm.module";
import { ContentModule } from "./content/content.module";
import { ProductsModule } from "./products/products.module";
import { PricingModule } from "./pricing/pricing.module";
import { QuotesModule } from "./quotes/quotes.module";
import { AdminModule } from "./admin/admin.module";
import { BookingsModule } from "./bookings/bookings.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { AiModule } from "./ai/ai.module";
import { DeparturesModule } from "./departures/departures.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { FleetModule } from "./fleet/fleet.module";
import { TradeModule } from "./trade/trade.module";
import { VehicleRentalsModule } from "./vehicle-rentals/vehicle-rentals.module";
import { MessagingModule } from "./messaging/messaging.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    CrmModule,
    ContentModule,
    ProductsModule,
    PricingModule,
    QuotesModule,
    AdminModule,
    BookingsModule,
    MarketplaceModule,
    AiModule,
    DeparturesModule,
    ReviewsModule,
    FleetModule,
    TradeModule,
    VehicleRentalsModule,
    MessagingModule,
  ],
})
export class AppModule {}
