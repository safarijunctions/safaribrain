import { IsDateString, IsOptional, IsString } from "class-validator";

export class RequestRentalDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
