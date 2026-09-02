import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { UsersService } from "./users.service";
import { InviteUserDto } from "./dto/invite-user.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission(Permission.MANAGE_USERS)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.users.list(user.organizationId);
  }

  @Post("invite")
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.users.invite(user.organizationId, user.sub, dto);
  }

  @Patch(":membershipId")
  update(@CurrentUser() user: JwtPayload, @Param("membershipId") membershipId: string, @Body() dto: UpdateMembershipDto) {
    return this.users.updateMembership(user.organizationId, user.sub, membershipId, dto);
  }

  @Post(":membershipId/reset-password")
  resetPassword(@CurrentUser() user: JwtPayload, @Param("membershipId") membershipId: string) {
    return this.users.resetPassword(user.organizationId, user.sub, membershipId);
  }

  @Delete(":membershipId")
  remove(@CurrentUser() user: JwtPayload, @Param("membershipId") membershipId: string) {
    return this.users.removeMembership(user.organizationId, user.sub, membershipId);
  }
}
