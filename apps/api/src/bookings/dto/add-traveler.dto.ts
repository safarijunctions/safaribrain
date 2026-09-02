import { IsDateString, IsOptional, IsString } from "class-validator";

export class AddTravelerDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;
}
