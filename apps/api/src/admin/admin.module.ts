import { Module } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { IntegrationsController } from "./integrations.controller";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  providers: [IntegrationsService, UsersService],
  controllers: [IntegrationsController, UsersController],
  exports: [IntegrationsService],
})
export class AdminModule {}
