import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class HoldSeatsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  seatIds!: string[];

  // Client-generated (crypto.randomUUID()) and reused across calls, same
  // trust model as ProposalLink/Booking.ticketToken — an unguessable token
  // rather than a login, matching §5's no-account-required principle even
  // for the instant-booking flow.
  @IsString()
  holderToken!: string;
}
