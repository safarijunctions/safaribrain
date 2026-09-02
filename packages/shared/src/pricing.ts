// Shape of a computed price breakdown. This is the DTO the pricing engine
// returns and the exact shape frozen into an immutable price_snapshot once
// a quote is accepted — §1.8, §6.

export interface CostLineDto {
  label: string;
  category: "PARK_FEE" | "ACCOMMODATION" | "TRANSPORT" | "ACTIVITY" | "OTHER";
  quantity: number;
  unitCost: number;
  currency: string;
  /** Only ever present on the internal breakdown — never sent to the client view. */
  internal: boolean;
}

export interface PriceBreakdownDto {
  currency: string;
  costLines: CostLineDto[];
  subtotalCost: number;
  markupPercent: number;
  markupAmount: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  totalClientPrice: number;
  /** Fee source dates shown near price per §1.4 — "trust is visible". */
  feeSourcesAsOf: { parkFeeRuleId: string; label: string; asOfDate: string }[];
}

export function clientSafeBreakdown(
  breakdown: PriceBreakdownDto,
): Omit<PriceBreakdownDto, "costLines"> & { costLines: CostLineDto[] } {
  // Internal cost lines (supplier net rates, commission) must never leak to
  // the client-facing proposal — §10 acceptance criterion 3.
  return {
    ...breakdown,
    costLines: breakdown.costLines.filter((l) => !l.internal),
  };
}
