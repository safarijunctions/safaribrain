import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AdminModule } from "../admin/admin.module";
import { CrmModule } from "../crm/crm.module";
import { BookingsModule } from "../bookings/bookings.module";
import { NokiService } from "./noki.service";
import { NokiController } from "./noki.controller";

@Module({
  imports: [AiModule, AdminModule, CrmModule, BookingsModule],
  providers: [NokiService],
  controllers: [NokiController],
})
export class NokiModule {}
