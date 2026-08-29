import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { ContentService } from "./content.service";

@Controller("content/places")
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.content.listPlaces(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.content.getPlace(user.organizationId, id);
  }
}
