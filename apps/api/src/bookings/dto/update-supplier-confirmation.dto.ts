import { IsEnum, IsOptional, IsString } from "class-validator";
import { SupplierConfirmationStatus } from "@safaribrain/shared";

export class UpdateSupplierConfirmationDto {
  @IsEnum(SupplierConfirmationStatus)
  status!: SupplierConfirmationStatus;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
