import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { NokiService } from "./noki.service";
import { NokiMessageDto } from "./dto/noki-message.dto";

// Read-only assistant over an org's own CRM/bookings/dashboard data — any
// authenticated staff member can use it, same as the CRM inbox itself; it
// has no write path, so there's no extra permission to gate.
@Controller("ai/noki")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NokiController {
  constructor(private readonly noki: NokiService) {}

  @Post("message")
  ask(@CurrentUser() user: JwtPayload, @Body() dto: NokiMessageDto) {
    return this.noki.ask(user.organizationId, dto.messages);
  }
}
