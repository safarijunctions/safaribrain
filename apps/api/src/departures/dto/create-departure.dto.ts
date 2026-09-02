import { IsDateString, IsInt, IsNumber, IsPositive, IsString, Max, Min } from "class-validator";

export class CreateDepartureDto {
  @IsDateString()
  departureDate!: string;

  @IsString()
  currency!: string;

  @IsNumber()
  @IsPositive()
  pricePerSeat!: number;

  @IsInt()
  @Min(1)
  @Max(60)
  totalSeats!: number;
}
