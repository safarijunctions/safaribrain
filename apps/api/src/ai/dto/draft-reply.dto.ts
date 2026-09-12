import { IsString } from "class-validator";

export class DraftReplyDto {
  @IsString()
  requestId!: string;
}
