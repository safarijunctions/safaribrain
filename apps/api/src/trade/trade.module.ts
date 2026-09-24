import { Module } from "@nestjs/common";
import { DeparturesModule } from "../departures/departures.module";
import { TradeService } from "./trade.service";
import { TradeController } from "./trade.controller";

@Module({
  imports: [DeparturesModule],
  providers: [TradeService],
  controllers: [TradeController],
})
export class TradeModule {}
