import { IsInt, IsString, Max, Min } from "class-validator";

export class DraftItineraryDto {
  @IsString()
  prompt!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  durationDays!: number;
}
