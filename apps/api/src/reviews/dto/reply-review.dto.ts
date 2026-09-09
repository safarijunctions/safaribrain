import { IsString } from "class-validator";

export class ReplyReviewDto {
  @IsString()
  text!: string;
}
