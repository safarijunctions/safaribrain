import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AiJobKind } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { AiJobsService } from "./ai-jobs.service";
import { DraftReplyDto } from "./dto/draft-reply.dto";
import { ApproveReplyDto } from "./dto/approve-reply.dto";

// A reply draft never becomes catalog content or touches money, so unlike
// AiJobsController (itinerary drafts, gated by MANAGE_CONTENT) this only
// requires the org membership every other CRM action already requires.
@Controller("ai/reply-drafts")
@UseGuards(JwtAuthGuard)
export class ReplyDraftsController {
  constructor(private readonly aiJobs: AiJobsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query("requestId") requestId: string) {
    return this.aiJobs.listReplyDrafts(user.organizationId, requestId);
  }

  @Post()
  draft(@CurrentUser() user: JwtPayload, @Body() dto: DraftReplyDto) {
    return this.aiJobs.draftReply(user.organizationId, user.sub, dto);
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ApproveReplyDto) {
    return this.aiJobs.approveReply(user.organizationId, user.sub, id, dto);
  }

  @Post(":id/reject")
  reject(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.aiJobs.reject(user.organizationId, user.sub, id, AiJobKind.REPLY_DRAFT);
  }
}
