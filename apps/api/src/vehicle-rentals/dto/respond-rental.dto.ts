import { IsIn } from "class-validator";

export class RespondRentalDto {
  @IsIn(["ACCEPTED", "DECLINED"])
  decision!: "ACCEPTED" | "DECLINED";
}
