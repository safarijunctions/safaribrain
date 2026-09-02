import { Module } from "@nestjs/common";
import { DeparturesService } from "./departures.service";
import { DeparturesController } from "./departures.controller";

@Module({
  providers: [DeparturesService],
  controllers: [DeparturesController],
  exports: [DeparturesService],
})
export class DeparturesModule {}
