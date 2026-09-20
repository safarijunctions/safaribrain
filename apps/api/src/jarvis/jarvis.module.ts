import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AdminModule } from "../admin/admin.module";
import { CrmModule } from "../crm/crm.module";
import { BookingsModule } from "../bookings/bookings.module";
import { JarvisService } from "./jarvis.service";
import { JarvisController } from "./jarvis.controller";

@Module({
  imports: [AiModule, AdminModule, CrmModule, BookingsModule],
  providers: [JarvisService],
  controllers: [JarvisController],
})
export class JarvisModule {}
