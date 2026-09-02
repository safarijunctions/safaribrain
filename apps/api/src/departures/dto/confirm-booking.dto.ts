import { IsEmail, IsOptional, IsString } from "class-validator";

export class ConfirmSeatBookingDto {
  @IsString()
  holderToken!: string;

  @IsString()
  contactFullName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsString()
  contactCountry?: string;
}
