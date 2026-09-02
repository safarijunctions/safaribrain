import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

// §4.5 fee governance: every fee needs a source and an as-of date so what a
// client sees can always be traced back to where the number came from.
export class UpsertFeeRuleDto {
  @IsString()
  label!: string;

  @IsString()
  residency!: string; // "RESIDENT" | "NON_RESIDENT" | "EAST_AFRICAN"

  @IsOptional()
  @IsString()
  ageBand?: string; // "ADULT" | "CHILD" | "INFANT"

  @IsString()
  unit!: string; // "PER_PERSON_PER_DAY" | "PER_VEHICLE_PER_ENTRY" | ...

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsDateString()
  sourceAsOf!: string;
}
