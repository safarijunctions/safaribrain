import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { CostLineInputDto } from "../../pricing/dto/cost-line-input.dto";

export class CreateQuoteDto {
  @IsString()
  requestId!: string;

  @IsString()
  tourTemplateId!: string;

  @IsString()
  currency!: string;

  @IsIn(["RESIDENT", "NON_RESIDENT", "EAST_AFRICAN"])
  residency!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostLineInputDto)
  extraCostLines!: CostLineInputDto[];

  @IsNumber()
  @Min(0)
  markupPercent!: number;

  @IsNumber()
  @Min(0)
  discountAmount!: number;

  @IsNumber()
  @Min(0)
  taxPercent!: number;

  @IsNumber()
  @Min(0)
  commissionPercent!: number;
}
