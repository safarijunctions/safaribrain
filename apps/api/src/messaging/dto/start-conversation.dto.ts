import { IsString, MinLength } from "class-validator";

export class StartConversationDto {
  @IsString()
  counterpartOrganizationId!: string;

  @IsString()
  @MinLength(1)
  body!: string;
}
