import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listPlaces(organizationId: string) {
    return this.prisma.place.findMany({
      where: { organizationId },
      include: { feeRules: true },
      orderBy: { name: "asc" },
    });
  }

  async getPlace(organizationId: string, id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, organizationId },
      include: { feeRules: true },
    });
    if (!place) throw new NotFoundException("Place not found");
    return place;
  }
}
