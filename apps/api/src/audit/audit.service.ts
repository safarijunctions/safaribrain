import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Every consequential action (quote approval, acceptance, fee publish, refund,
// payout) must leave an immutable trail — §6 Platform.audit_log, §9 "No AI
// action may silently alter...", §10 acceptance criterion 4.
//
// organizationId is required — even a public proposal-token action (accept/
// request-changes, no authenticated actor) always happens within one org's
// data, and scoping every entry lets an admin pull "everything that
// happened in my org" to help a user who reports a problem.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    organizationId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? undefined) as any,
      },
    });
  }

  async list(organizationId: string, opts: { page: number; pageSize: number; entityType?: string; entityId?: string }) {
    const where = {
      organizationId,
      ...(opts.entityType ? { entityType: opts.entityType } : {}),
      ...(opts.entityId ? { entityId: opts.entityId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows, total, page: opts.page, pageSize: opts.pageSize };
  }
}
