import { Module } from "@nestjs/common";
import { DeparturesService } from "./departures.service";
import { DeparturesController, DepartureTradeController } from "./departures.controller";

@Module({
  providers: [DeparturesService],
  controllers: [DeparturesController, DepartureTradeController],
  exports: [DeparturesService],
})
export class DeparturesModule {}
