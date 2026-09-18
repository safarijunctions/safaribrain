import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { RentalListingVisibility } from "@safaribrain/shared";

export class UpsertRentalListingDto {
  @IsNumber()
  @IsPositive()
  dailyRate!: number;

  @IsString()
  currency!: string;

  @IsIn(Object.values(RentalListingVisibility))
  visibility!: RentalListingVisibility;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
