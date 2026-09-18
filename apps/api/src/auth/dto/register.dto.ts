import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { OrganizationKind } from "@safaribrain/shared";

// Self-service sign-up for the tourism-professional side of the platform
// (operator company, individual guide, or travel agent/agency) — every
// prior account in this system was created by an admin/seed script, but
// §6's Trade marketplace only works if guides and agents can join without
// waiting on one. The new organization starts unverified (Organization
// .verified defaults false), same trust gate every existing marketplace/
// trade query already checks.
export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  organizationName!: string;

  @IsIn(Object.values(OrganizationKind))
  organizationKind!: OrganizationKind;

  @IsString()
  @MinLength(2)
  country!: string;

  @IsString()
  @MinLength(3)
  currency!: string;
}
