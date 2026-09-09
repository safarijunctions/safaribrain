import { IsIn } from "class-validator";

export class ModerateReviewDto {
  @IsIn(["PUBLISH", "REJECT"])
  decision!: "PUBLISH" | "REJECT";
}
