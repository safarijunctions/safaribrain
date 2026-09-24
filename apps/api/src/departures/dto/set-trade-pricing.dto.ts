import { IsBoolean, IsNumber, IsPositive } from "class-validator";

export class SetTradePricingDto {
  @IsNumber()
  @IsPositive()
  netPricePerSeat!: number;

  @IsBoolean()
  tradeVisible!: boolean;
}
