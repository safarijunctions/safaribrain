import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

// The custom-safari conversational builder's submission (§ "custom safari
// conversational builder" in the design brief). No AI call happens here —
// LLM credentials are per-organization (see LlmService), so there is no
// single key a cross-org, no-account traveler flow could charge a call to.
// Instead the conversation just gathers a structured brief, same shape as
// MarketplaceEnquiryDto, plus the trip-style/duration/budget tags the
// conversation collected.
export class CustomSafariEnquiryDto {
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
  budgetTier?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
