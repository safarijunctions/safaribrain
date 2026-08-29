import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { QuotesService } from "./quotes.service";
import { QuotesController } from "./quotes.controller";
import { ProposalsController } from "./proposals.controller";

@Module({
  imports: [PricingModule],
  providers: [QuotesService],
  controllers: [QuotesController, ProposalsController],
})
export class QuotesModule {}
