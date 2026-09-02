import { Injectable } from "@nestjs/common";
import { CostLineDto, PriceBreakdownDto } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CostLineInputDto } from "./dto/cost-line-input.dto";

export interface ComputeBreakdownInput {
  templateVersionId: string;
  partySize: number;
  residency: string; // "RESIDENT" | "NON_RESIDENT" | "EAST_AFRICAN"
  currency: string;
  extraCostLines: CostLineInputDto[]; // operator-entered supplier costs (accommodation, transport, activities)
  markupPercent: number;
  discountAmount: number;
  taxPercent: number;
  commissionPercent: number;
}

// The pricing engine — §4.4/§4.5/§10.3: residency, age, currency, park fees,
// supplier costs, markup, discount, tax, and commission all combine here.
// Internal cost lines are computed but must be stripped before anything is
// shown to the client (see clientSafeBreakdown in @safaribrain/shared).
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async computeBreakdown(input: ComputeBreakdownInput): Promise<PriceBreakdownDto> {
    const version = await this.prisma.templateVersion.findUniqueOrThrow({
      where: { id: input.templateVersionId },
      include: { days: { include: { place: { include: { feeRules: true } } } } },
    });

    const now = new Date();
    const parkFeeLines: CostLineDto[] = [];
    const feeSourcesAsOf: PriceBreakdownDto["feeSourcesAsOf"] = [];

    for (const day of version.days) {
      if (!day.place) continue;
      const applicableRule = day.place.feeRules.find(
        (rule) =>
          rule.residency === input.residency &&
          rule.effectiveFrom <= now &&
          (!rule.effectiveTo || rule.effectiveTo >= now),
      );
      if (!applicableRule) continue;

      parkFeeLines.push({
        label: `${day.place.name} park fee (${applicableRule.label})`,
        category: "PARK_FEE",
        quantity: input.partySize,
        unitCost: Number(applicableRule.amount),
        currency: applicableRule.currency,
        internal: false, // park fees are shown to the client transparently — §1.4 "trust is visible"
      });
      feeSourcesAsOf.push({
        parkFeeRuleId: applicableRule.id,
        label: `${day.place.name} — ${applicableRule.label}`,
        asOfDate: applicableRule.sourceAsOf.toISOString(),
      });
    }

    const costLines = [...parkFeeLines, ...input.extraCostLines];
    const subtotalCost = costLines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    const markupAmount = round2(subtotalCost * (input.markupPercent / 100));
    const preTax = subtotalCost + markupAmount - input.discountAmount;
    const taxAmount = round2(preTax * (input.taxPercent / 100));
    const totalClientPrice = round2(preTax + taxAmount);
    const commissionAmount = round2(totalClientPrice * (input.commissionPercent / 100));

    return {
      currency: input.currency,
      costLines,
      subtotalCost: round2(subtotalCost),
      markupPercent: input.markupPercent,
      markupAmount,
      discountAmount: input.discountAmount,
      taxPercent: input.taxPercent,
      taxAmount,
      commissionPercent: input.commissionPercent,
      commissionAmount,
      totalClientPrice,
      feeSourcesAsOf,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
