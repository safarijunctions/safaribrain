import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsIn, IsString, MaxLength, ValidateNested } from "class-validator";

export class NokiTurnDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @MaxLength(4000)
  content!: string;
}

// The client sends the whole conversation each time (no server-side session
// state yet — Noki is a stateless read-only Q&A loop, not a persisted
// chat feature). Capped so one request can't be turned into an unbounded
// prompt-stuffing / cost attack against the org's own LLM_PROVIDER key.
export class NokiMessageDto {
  @ValidateNested({ each: true })
  @Type(() => NokiTurnDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  messages!: NokiTurnDto[];
}
