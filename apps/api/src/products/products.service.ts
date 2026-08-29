import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
