import { IsArray, IsEnum, IsOptional } from "class-validator";
import { Permission, UserRole } from "@safaribrain/shared";

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];
}
