import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { VehicleStatus } from "@safaribrain/shared";

export class UpsertVehicleDto {
  @IsString()
  name!: string;

  @IsString()
  registrationNumber!: string;

  @IsInt()
  @IsPositive()
  capacity!: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsDateString()
  inspectionExpiry?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
