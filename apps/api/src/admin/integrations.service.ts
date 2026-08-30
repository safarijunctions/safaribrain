import { Injectable, NotFoundException } from "@nestjs/common";
import { INTEGRATION_CATEGORY_BY_PROVIDER, IntegrationProvider } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpsertIntegrationDto } from "./dto/upsert-integration.dto";

// Lets an admin add/rotate provider credentials (payment, messaging, AI)
// from the Admin Portal after the app ships, instead of the team hardcoding
// a provider choice at build time — §11, §4.9.
//
// Secrets are write-only: every read path strips them down to a boolean
// `secretsConfigured` plus the list of keys set (never their values), so a
// leaked API response or a careless log line can't expose a live API key.
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.integration.findMany({ where: { organizationId }, orderBy: { provider: "asc" } });
    return rows.map(toSafeIntegration);
  }

  async upsert(organizationId: string, actorId: string | undefined, dto: UpsertIntegrationDto) {
    const category = INTEGRATION_CATEGORY_BY_PROVIDER[dto.provider];
    const existing = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: dto.provider } },
    });

    // Merge secrets rather than replace, so updating one credential doesn't
    // require the admin to re-paste every other secret for that provider.
    const mergedSecrets = { ...(existing?.secrets as Record<string, unknown> | undefined), ...(dto.secrets ?? {}) };
    const mergedConfig = { ...(existing?.config as Record<string, unknown> | undefined), ...(dto.config ?? {}) };

    const row = await this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: dto.provider } },
      create: {
        organizationId,
        provider: dto.provider,
        category,
        displayName: dto.displayName,
        enabled: dto.enabled ?? false,
        config: mergedConfig as any,
        secrets: mergedSecrets as any,
        createdById: actorId,
      },
      update: {
        displayName: dto.displayName,
        enabled: dto.enabled,
        config: mergedConfig as any,
        secrets: mergedSecrets as any,
      },
    });

    // Never write secret values to the audit log — only that credentials
    // were touched and which non-secret keys changed.
    await this.audit.record({
      actorId,
      action: existing ? "integration.update" : "integration.create",
      entityType: "Integration",
      entityId: row.id,
      metadata: { provider: dto.provider, enabled: row.enabled, configKeys: Object.keys(mergedConfig) },
    });

    return toSafeIntegration(row);
  }

  async setEnabled(organizationId: string, actorId: string | undefined, id: string, enabled: boolean) {
    const row = await this.getOwned(organizationId, id);
    const updated = await this.prisma.integration.update({ where: { id: row.id }, data: { enabled } });
    await this.audit.record({ actorId, action: "integration.toggle", entityType: "Integration", entityId: id, metadata: { enabled } });
    return toSafeIntegration(updated);
  }

  async remove(organizationId: string, actorId: string | undefined, id: string) {
    const row = await this.getOwned(organizationId, id);
    await this.prisma.integration.delete({ where: { id: row.id } });
    await this.audit.record({ actorId, action: "integration.delete", entityType: "Integration", entityId: id, metadata: { provider: row.provider } });
    return { deleted: true };
  }

  private async getOwned(organizationId: string, id: string) {
    const row = await this.prisma.integration.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundException("Integration not found");
    return row;
  }

  // Used by other server-side modules (e.g. a future PaymentsService) that
  // need the real secret values to call a provider's API — never exposed
  // over HTTP.
  async getEnabledForCategory(organizationId: string, category: string) {
    return this.prisma.integration.findMany({ where: { organizationId, category, enabled: true } });
  }
}

function toSafeIntegration(row: {
  id: string;
  organizationId: string;
  provider: string;
  category: string;
  displayName: string;
  enabled: boolean;
  config: unknown;
  secrets: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const secretKeys = Object.keys((row.secrets as Record<string, unknown>) ?? {});
  return {
    id: row.id,
    provider: row.provider as IntegrationProvider,
    category: row.category,
    displayName: row.displayName,
    enabled: row.enabled,
    config: row.config,
    secretsConfigured: secretKeys.length > 0,
    secretKeys,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
