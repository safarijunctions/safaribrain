import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpsertPlaceDto } from "./dto/upsert-place.dto";
import { UpsertFeeRuleDto } from "./dto/upsert-fee-rule.dto";

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listPlaces(organizationId: string, country?: string) {
    return this.prisma.place.findMany({
      where: { organizationId, ...(country ? { country } : {}) },
      include: { feeRules: true },
      orderBy: [{ country: "asc" }, { name: "asc" }],
    });
  }

  // Distinct countries already in the catalog — powers the country filter
  // on both the admin content manager and the public marketplace, growing
  // automatically as content beyond Tanzania is added (§1.7, pan-African
  // scope raised mid-build).
  async listCountries(organizationId: string) {
    const rows = await this.prisma.place.findMany({
      where: { organizationId },
      select: { country: true },
      distinct: ["country"],
      orderBy: { country: "asc" },
    });
    return rows.map((r) => r.country);
  }

  async getPlace(organizationId: string, id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, organizationId },
      include: { feeRules: true },
    });
    if (!place) throw new NotFoundException("Place not found");
    return place;
  }

  async createPlace(organizationId: string, actorId: string | undefined, dto: UpsertPlaceDto) {
    const place = await this.prisma.place.create({ data: { organizationId, ...dto } });
    await this.audit.record({ organizationId, actorId, action: "content.place.create", entityType: "Place", entityId: place.id, metadata: { name: place.name, country: place.country } });
    return place;
  }

  async updatePlace(organizationId: string, actorId: string | undefined, id: string, dto: UpsertPlaceDto) {
    await this.getPlace(organizationId, id);
    const place = await this.prisma.place.update({ where: { id }, data: dto });
    await this.audit.record({ organizationId, actorId, action: "content.place.update", entityType: "Place", entityId: place.id, metadata: { name: place.name, country: place.country } });
    return place;
  }

  async deletePlace(organizationId: string, actorId: string | undefined, id: string) {
    const place = await this.getPlace(organizationId, id);
    await this.prisma.place.delete({ where: { id } });
    await this.audit.record({ organizationId, actorId, action: "content.place.delete", entityType: "Place", entityId: id, metadata: { name: place.name } });
    return { deleted: true };
  }

  async addFeeRule(organizationId: string, actorId: string | undefined, placeId: string, dto: UpsertFeeRuleDto) {
    await this.getPlace(organizationId, placeId);
    const rule = await this.prisma.parkFeeRule.create({
      data: { placeId, ...dto, sourceAsOf: new Date(dto.sourceAsOf) },
    });
    await this.audit.record({ organizationId, actorId, action: "content.fee_rule.create", entityType: "ParkFeeRule", entityId: rule.id, metadata: { placeId, label: rule.label, amount: dto.amount, currency: dto.currency } });
    return rule;
  }

  async updateFeeRule(organizationId: string, actorId: string | undefined, placeId: string, ruleId: string, dto: UpsertFeeRuleDto) {
    await this.getPlace(organizationId, placeId);
    const existing = await this.prisma.parkFeeRule.findFirst({ where: { id: ruleId, placeId } });
    if (!existing) throw new NotFoundException("Fee rule not found");
    const rule = await this.prisma.parkFeeRule.update({
      where: { id: ruleId },
      data: { ...dto, sourceAsOf: new Date(dto.sourceAsOf) },
    });
    await this.audit.record({ organizationId, actorId, action: "content.fee_rule.update", entityType: "ParkFeeRule", entityId: rule.id, metadata: { placeId, label: rule.label, amount: dto.amount, currency: dto.currency } });
    return rule;
  }

  async removeFeeRule(organizationId: string, actorId: string | undefined, placeId: string, ruleId: string) {
    await this.getPlace(organizationId, placeId);
    const existing = await this.prisma.parkFeeRule.findFirst({ where: { id: ruleId, placeId } });
    if (!existing) throw new NotFoundException("Fee rule not found");
    await this.prisma.parkFeeRule.delete({ where: { id: ruleId } });
    await this.audit.record({ organizationId, actorId, action: "content.fee_rule.delete", entityType: "ParkFeeRule", entityId: ruleId, metadata: { placeId, label: existing.label } });
    return { deleted: true };
  }
}
