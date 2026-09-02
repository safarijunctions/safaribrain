import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RequestStage, UserRole } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { CrmService } from "./crm.service";
import { CreateRequestDto } from "./dto/create-request.dto";

@Controller("crm/requests")
@UseGuards(JwtAuthGuard, RolesGuard)
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

  // Admin-only support tool: reassign a stuck/orphaned enquiry — §"admin can
  // help anywhere" resolved as a scoped, audited action, not a blanket
  // bypass of who owns what.
  @Patch(":id/owner")
  @Roles(UserRole.ADMIN)
  setOwner(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: { ownerId: string | null }) {
    return this.crm.setOwner(user.organizationId, id, user.sub, body.ownerId);
  }
}
