import { PriceBreakdownDto } from "@safaribrain/shared";
import { fromJsonField } from "./json-field";

// QuoteVersion.breakdown / PriceSnapshot.breakdown are JSON text on SQLite
// (see schema.prisma's datasource comment) — every place that reads a
// Quote (QuotesService, CrmService.getRequest) goes through these so
// callers get a real PriceBreakdownDto back, same as before SQLite.
export function parseVersion<T extends { breakdown: string }>(version: T) {
  return { ...version, breakdown: fromJsonField<PriceBreakdownDto>(version.breakdown, {} as PriceBreakdownDto) };
}

export function parseQuote<T extends { versions?: { breakdown: string }[]; priceSnapshot?: { breakdown: string } | null }>(quote: T) {
  return {
    ...quote,
    versions: quote.versions?.map(parseVersion),
    priceSnapshot: quote.priceSnapshot
      ? { ...quote.priceSnapshot, breakdown: fromJsonField<PriceBreakdownDto>(quote.priceSnapshot.breakdown, {} as PriceBreakdownDto) }
      : quote.priceSnapshot,
  };
}
