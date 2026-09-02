import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AiJobKind, Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { AiJobsService } from "./ai-jobs.service";
import { DraftItineraryDto } from "./dto/draft-itinerary.dto";
import { ApproveItineraryDto } from "./dto/approve-itinerary.dto";

// Drafting/approving becomes real catalog content — same MANAGE_CONTENT
// permission that gates Place/listing management (§3).
@Controller("ai/itinerary-drafts")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_CONTENT)
export class AiJobsController {
  constructor(private readonly aiJobs: AiJobsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.aiJobs.list(user.organizationId, AiJobKind.ITINERARY_DRAFT);
  }

  @Post()
  draft(@CurrentUser() user: JwtPayload, @Body() dto: DraftItineraryDto) {
    return this.aiJobs.draftItinerary(user.organizationId, user.sub, dto);
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ApproveItineraryDto) {
    return this.aiJobs.approveItinerary(user.organizationId, user.sub, id, dto);
  }

  @Post(":id/reject")
  reject(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.aiJobs.reject(user.organizationId, user.sub, id);
  }
}
