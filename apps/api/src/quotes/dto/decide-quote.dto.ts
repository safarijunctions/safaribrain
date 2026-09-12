import { IsIn, IsOptional, IsString } from "class-validator";

export class DecideQuoteDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  reason?: string;
}
