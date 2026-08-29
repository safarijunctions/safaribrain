import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RequestStage } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { CrmService } from "./crm.service";
import { CreateRequestDto } from "./dto/create-request.dto";

@Controller("crm/requests")
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.crm.createRequest(user.organizationId, user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.crm.listRequests(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.crm.getRequest(user.organizationId, id);
  }

  @Patch(":id/stage")
  setStage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: { stage: RequestStage; note?: string },
  ) {
    return this.crm.setStage(user.organizationId, id, user.sub, body.stage, body.note);
  }
}
