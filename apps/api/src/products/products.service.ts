import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listTemplates(organizationId: string) {
    return this.prisma.tourTemplate.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      orderBy: { title: "asc" },
    });
  }

  async getTemplateWithLatestVersion(organizationId: string, id: string) {
    const template = await this.prisma.tourTemplate.findFirst({
      where: { id, organizationId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { days: { include: { place: true }, orderBy: { dayNumber: "asc" } } },
        },
      },
    });
    if (!template) throw new NotFoundException("Tour template not found");
    return template;
  }

  // Phase 3 (§7) marketplace: an operator opts a template in/out of public
  // browsing — off by default, so nothing appears to travelers just by
  // existing in the catalog.
  async setListed(organizationId: string, actorId: string | undefined, id: string, publiclyListed: boolean) {
    const existing = await this.prisma.tourTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException("Tour template not found");
    const template = await this.prisma.tourTemplate.update({ where: { id }, data: { publiclyListed } });
    await this.audit.record({ organizationId, actorId, action: "product.template.set_listed", entityType: "TourTemplate", entityId: id, metadata: { publiclyListed } });
    return template;
  }
}
