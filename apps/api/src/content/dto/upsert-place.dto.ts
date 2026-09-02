import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpsertPlaceDto {
  @IsString()
  name!: string;

  // ISO 3166-1 alpha-2 (e.g. "KE", "UG", "RW") — free text by design so
  // any African country can be added without a schema change, per the
  // pan-African content scope raised mid-build.
  @IsString()
  country!: string;

  @IsString()
  kind!: string; // "NATIONAL_PARK" | "CONSERVATION_AREA" | "TOWN" | ...

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
