import { Module } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { IntegrationsController } from "./integrations.controller";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";

@Module({
  providers: [IntegrationsService, UsersService, DashboardService],
  controllers: [IntegrationsController, UsersController, DashboardController],
  exports: [IntegrationsService],
})
export class AdminModule {}
