import { IsString, MinLength } from "class-validator";

export class ApproveReplyDto {
  // The human-edited text that will actually be recorded/copied — never
  // the AI's raw output directly, same non-negotiable as ApproveItineraryDto.
  @IsString()
  @MinLength(1)
  replyText!: string;
}
