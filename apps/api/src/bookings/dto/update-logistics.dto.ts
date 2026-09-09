import { IsOptional, IsString } from "class-validator";

// Plain-text guide/pickup details for the guide manifest (§7 Phase 2
// "trip delivery") — not a User FK, since guides/drivers are frequently
// contracted rather than platform account holders.
export class UpdateLogisticsDto {
  @IsOptional()
  @IsString()
  guideName?: string;

  @IsOptional()
  @IsString()
  guidePhone?: string;

  @IsOptional()
  @IsString()
  pickupNotes?: string;

  // The fleet vehicle assigned to this trip (§4.3 "vehicle compliance") —
  // pass null to unassign.
  @IsOptional()
  @IsString()
  vehicleId?: string | null;
}
