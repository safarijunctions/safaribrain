import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { Permission, UserRole } from "@safaribrain/shared";

export class InviteUserDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];
}
