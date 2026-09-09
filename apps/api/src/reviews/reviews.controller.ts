import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { ReviewsService } from "./reviews.service";
import { ModerateReviewDto } from "./dto/moderate-review.dto";
import { ReplyReviewDto } from "./dto/reply-review.dto";

// Reputation is a moderation action, same as listing moderation (§3) —
// gated by MODERATE_LISTING, not just ADMIN role, so it can be granted
// narrowly.
@Controller("admin/reviews")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MODERATE_LISTING)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query("status") status?: string) {
    return this.reviews.listModerationQueue(user.organizationId, status);
  }

  @Post(":id/moderate")
  moderate(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(user.organizationId, user.sub, id, dto);
  }

  @Post(":id/reply")
  reply(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ReplyReviewDto) {
    return this.reviews.reply(user.organizationId, user.sub, id, dto);
  }
}
