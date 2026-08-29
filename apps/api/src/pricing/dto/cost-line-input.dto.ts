import { IsBoolean, IsIn, IsNumber, IsPositive, IsString } from "class-validator";

export class CostLineInputDto {
  @IsString()
  label!: string;

  @IsIn(["PARK_FEE", "ACCOMMODATION", "TRANSPORT", "ACTIVITY", "OTHER"])
  category!: "PARK_FEE" | "ACCOMMODATION" | "TRANSPORT" | "ACTIVITY" | "OTHER";

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  unitCost!: number;

  @IsString()
  currency!: string;

  @IsBoolean()
  internal!: boolean;
}
