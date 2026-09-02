import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { IntegrationProvider } from "@safaribrain/shared";

export class UpsertIntegrationDto {
  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // Non-secret fields — account IDs, phone numbers, from-address. Safe to
  // read back to the admin UI.
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  // API keys/tokens/signing secrets. Merged into the existing secrets on
  // update (a key omitted here is left as-is) and never returned by any
  // read endpoint — see IntegrationsService.
  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;
}
