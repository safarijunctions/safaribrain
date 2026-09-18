import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { MessagingService } from "./messaging.service";
import { StartConversationDto } from "./dto/start-conversation.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("messaging")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get("conversations")
  list(@CurrentUser() user: JwtPayload) {
    return this.messaging.listConversations(user.organizationId);
  }

  @Post("conversations")
  start(@CurrentUser() user: JwtPayload, @Body() dto: StartConversationDto) {
    return this.messaging.startConversation(user.organizationId, user.sub, dto.counterpartOrganizationId, dto.body);
  }

  @Get("conversations/:id/messages")
  messages(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.messaging.listMessages(user.organizationId, id);
  }

  @Post("conversations/:id/messages")
  send(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: SendMessageDto) {
    return this.messaging.sendMessage(user.organizationId, user.sub, id, dto.body);
  }
}
