import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../auth/jwt.strategy";
import { FleetService } from "./fleet.service";
import { UpsertVehicleDto } from "./dto/upsert-vehicle.dto";

// Vehicle compliance is safety-critical (§3) — every write is gated by
// MANAGE_FLEET, scoped separately from MANAGE_CONTENT/ADMIN so it can be
// granted narrowly to whoever actually runs the fleet.
@Controller("fleet/vehicles")
@UseGuards(JwtAuthGuard)
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.fleet.list(user.organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.fleet.get(user.organizationId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_FLEET)
  create(@CurrentUser() user: JwtPayload, @Body() dto: UpsertVehicleDto) {
    return this.fleet.create(user.organizationId, user.sub, dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_FLEET)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpsertVehicleDto) {
    return this.fleet.update(user.organizationId, user.sub, id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.MANAGE_FLEET)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.fleet.remove(user.organizationId, user.sub, id);
  }
}
