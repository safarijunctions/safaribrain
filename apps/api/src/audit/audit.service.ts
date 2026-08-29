import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Every consequential action (quote approval, acceptance, fee publish, refund,
// payout) must leave an immutable trail — §6 Platform.audit_log, §9 "No AI
// action may silently alter...", §10 acceptance criterion 4.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? undefined) as any,
      },
    });
  }
}
