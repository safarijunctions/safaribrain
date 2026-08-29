import { Type } from "class-transformer";
import { IsArray, IsNumber, Min, ValidateNested } from "class-validator";
import { CostLineInputDto } from "../../pricing/dto/cost-line-input.dto";

export class ReviseQuoteDto {
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
