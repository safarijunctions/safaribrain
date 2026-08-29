import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { LeadSourceChannel } from "@safaribrain/shared";

export class CreateRequestDto {
  // Contact — deduplicated server-side by (organizationId, email) per §10.1
  @IsString()
  contactFullName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsString()
  contactCountry?: string;

  @IsEnum(LeadSourceChannel)
  source!: LeadSourceChannel;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  partySize!: number;

  @IsOptional()
  @IsString()
  budgetTier?: string;

  @IsOptional()
  @IsDateString()
  preferredStart?: string;

  @IsOptional()
  @IsDateString()
  preferredEnd?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
