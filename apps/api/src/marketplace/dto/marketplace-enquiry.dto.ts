import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Min } from "class-validator";

// A subset of CrmService.createRequest's CreateRequestDto — source is
// forced to WEB server-side (never client-choosable) and there's no
// interests/budgetTier free-for-all a public form shouldn't need.
export class MarketplaceEnquiryDto {
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

  @IsInt()
  @Min(1)
  @Type(() => Number)
  partySize!: number;

  @IsOptional()
  @IsDateString()
  preferredStart?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
