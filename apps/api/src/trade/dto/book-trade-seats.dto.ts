import { IsEmail, IsOptional, IsString } from "class-validator";

// The end traveler the agent is booking on behalf of — the agent's own
// organization is taken from the authenticated caller, not this body, so
// an agent can never book a trade seat under a different org's name.
export class BookTradeSeatsDto {
  @IsString()
  holderToken!: string;

  @IsString()
  endClientFullName!: string;

  @IsEmail()
  endClientEmail!: string;

  @IsOptional()
  @IsString()
  endClientWhatsapp?: string;

  @IsOptional()
  @IsString()
  endClientCountry?: string;
}
