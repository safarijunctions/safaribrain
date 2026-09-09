import { IsDateString, IsOptional, IsString } from "class-validator";

export class AddSupplierConfirmationDto {
  @IsString()
  supplierName!: string;

  @IsOptional()
  @IsString()
  supplierType?: string;

  @IsOptional()
  @IsDateString()
  neededBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
