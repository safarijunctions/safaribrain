import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ReviseQuoteDto } from "./dto/revise-quote.dto";

@Controller("quotes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quotes.createDraft(user.organizationId, user.sub, dto);
  }

  @Post(":id/revise")
  revise(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ReviseQuoteDto) {
    return this.quotes.revise(user.organizationId, user.sub, id, dto);
  }

  @Post(":id/submit-for-approval")
  submit(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.quotes.submitForApproval(user.organizationId, user.sub, id);
  }

  // §3: approving a quote is a scoped permission, not implied by role alone —
  // an Operator who authored the quote should not also be the one approving it.
  @Post(":id/decide")
  @RequirePermission(Permission.APPROVE_QUOTE)
  decide(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: { decision: "APPROVED" | "REJECTED"; reason?: string },
  ) {
    return this.quotes.decide(user.organizationId, user.sub, id, body.decision, body.reason);
  }

  @Post(":id/send")
  send(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.quotes.send(user.organizationId, user.sub, id);
  }
}
