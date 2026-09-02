import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class ApprovedDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  mealsIncluded!: string[];
}

// What the human actually approves — pre-filled from the AI draft but
// editable before submission, so "approval" means the operator reviewed
// and can change wording/days, not just clicked a rubber-stamp button (§9).
export class ApproveItineraryDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  termsMarkdown?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovedDayDto)
  days!: ApprovedDayDto[];
}
