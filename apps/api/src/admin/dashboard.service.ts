import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Read-only summary for the Admin Portal's Overview tab — §4.9 "basic
// admin/.../dashboard" from the Phase 1 scope. Deliberately just counts and
// sums (no charting library, no time-series) since nothing here needs more
// than a stat-tile row yet; a real analytics view is Phase 4 (§4.9
// "analytics").
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string) {
    const [requestsByStage, quotesByStatus, revenueByCurrency, teamMembersCount, integrationsEnabledCount, openTasksCount] =
      await Promise.all([
        this.prisma.enquiryRequest.groupBy({ by: ["stage"], where: { organizationId }, _count: { _all: true } }),
        this.prisma.quote.groupBy({ by: ["status"], where: { request: { organizationId } }, _count: { _all: true } }),
        this.prisma.priceSnapshot.groupBy({
          by: ["currency"],
          where: { quote: { request: { organizationId } } },
          _sum: { totalPrice: true },
        }),
        this.prisma.membership.count({ where: { organizationId } }),
        this.prisma.integration.count({ where: { organizationId, enabled: true } }),
        this.prisma.task.count({ where: { request: { organizationId }, completedAt: null } }),
      ]);

    return {
      requestsByStage: Object.fromEntries(requestsByStage.map((r) => [r.stage, r._count._all])),
      quotesByStatus: Object.fromEntries(quotesByStatus.map((q) => [q.status, q._count._all])),
      acceptedRevenue: revenueByCurrency.map((r) => ({ currency: r.currency, total: r._sum.totalPrice ?? 0 })),
      teamMembersCount,
      integrationsEnabledCount,
      openTasksCount,
    };
  }
}
