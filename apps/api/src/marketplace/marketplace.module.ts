import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { DeparturesModule } from "../departures/departures.module";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceController } from "./marketplace.controller";

@Module({
  imports: [CrmModule, DeparturesModule],
  providers: [MarketplaceService],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
