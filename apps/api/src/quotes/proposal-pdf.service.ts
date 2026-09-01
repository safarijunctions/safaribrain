import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PriceBreakdownDto } from "@safaribrain/shared";

export interface ProposalPdfInput {
  contactName: string;
  itinerary?: {
    termsMarkdown?: string | null;
    days: { dayNumber: number; title: string; place?: { name: string } | null; mealsIncluded: string[] }[];
  };
  breakdown: PriceBreakdownDto;
  isFrozen: boolean;
}

// The brief calls for the sent proposal to exist as "web + PDF" (§4.4).
// This renders the same client-safe breakdown the public ProposalPage shows
// — the caller (QuotesService.getProposalByToken) already strips internal
// cost lines before this ever sees the data, so there's no separate
// redaction step needed here.
//
// Colors mirror the web app's "African savanna" theme (clay/acacia/sunset —
// see apps/web/tailwind.config.js) so the PDF and the live proposal page
// read as the same brand, not two different products.
const CLAY_700 = "#853d20";
const CLAY_800 = "#66301c";
const ACACIA_700 = "#375228";
const SUNSET_300 = "#f2c866";
const INK = "#292524";
const MUTED = "#78716c";
const FAINT = "#a8a29e";
const RULE = "#e7d9cb";

@Injectable()
export class ProposalPdfService {
  render(input: ProposalPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const MARGIN = 50;
      const PAGE_WIDTH = doc.page.width;

      // Header band — echoes the web page's clay-to-acacia gradient header
      // with a flat fill (PDFKit has no gradient text fill worth the
      // complexity here) plus a thin sunset accent rule underneath.
      doc.rect(0, 0, PAGE_WIDTH, 108).fill(CLAY_800);
      doc.rect(0, 108, PAGE_WIDTH, 3).fill(SUNSET_300);

      doc
        .fillColor(SUNSET_300)
        .fontSize(9)
        .text("SAFARI JUNCTION'S ADVENTURES", MARGIN, 28, { characterSpacing: 1.5 });
      doc.fillColor("#ffffff").fontSize(21).text("Your safari proposal", MARGIN, 42);
      doc.fillColor("#ffffff").opacity(0.85).fontSize(11).text(`Prepared for ${input.contactName}`, MARGIN, 74);
      doc.opacity(1);

      doc.y = 135;
      doc.x = MARGIN;

      if (input.itinerary?.days.length) {
        doc.fillColor(CLAY_700).fontSize(14).text("Itinerary", MARGIN);
        doc.moveDown(0.4);
        for (const day of input.itinerary.days) {
          doc.fontSize(11).fillColor(INK).text(`Day ${day.dayNumber}: ${day.title}`, MARGIN);
          if (day.place) doc.fontSize(9).fillColor(ACACIA_700).text(day.place.name, MARGIN);
          doc.fontSize(9).fillColor(FAINT).text(`Meals: ${day.mealsIncluded.join(", ") || "—"}`, MARGIN);
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);
      }

      doc.fillColor(CLAY_700).fontSize(14).text("Price", MARGIN);
      doc.moveDown(0.4);
      const { breakdown } = input;
      for (const line of breakdown.costLines) {
        rowLine(doc, line.label, `${line.currency} ${(line.quantity * line.unitCost).toLocaleString()}`, MARGIN);
      }
      if (breakdown.discountAmount > 0)
        rowLine(doc, "Discount", `-${breakdown.currency} ${breakdown.discountAmount.toLocaleString()}`, MARGIN);
      if (breakdown.taxAmount > 0)
        rowLine(doc, `Tax (${breakdown.taxPercent}%)`, `${breakdown.currency} ${breakdown.taxAmount.toLocaleString()}`, MARGIN);
      doc.moveDown(0.2);
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor(RULE).lineWidth(1.5).stroke();
      doc.moveDown(0.35);
      rowLine(doc, "Total", `${breakdown.currency} ${breakdown.totalClientPrice.toLocaleString()}`, MARGIN, true);
      doc.moveDown(0.7);

      if (breakdown.feeSourcesAsOf.length) {
        doc
          .fontSize(8)
          .fillColor(FAINT)
          .text(
            `Park fees shown as of ${breakdown.feeSourcesAsOf.map((f) => new Date(f.asOfDate).toLocaleDateString()).join(", ")} — official published rates, subject to change by the relevant park authority before booking is confirmed.`,
            MARGIN,
            doc.y,
            { width: PAGE_WIDTH - MARGIN * 2 },
          );
        doc.moveDown(0.5);
      }

      if (input.isFrozen) {
        doc
          .fontSize(9)
          .fillColor(ACACIA_700)
          .text("● This price is confirmed and locked in for your booking — it will not change.", MARGIN, doc.y);
        doc.moveDown(0.5);
      }

      if (input.itinerary?.termsMarkdown) {
        doc.moveDown(0.4);
        doc.fontSize(11).fillColor(CLAY_700).text("Terms", MARGIN);
        doc.fontSize(9).fillColor(MUTED).text(input.itinerary.termsMarkdown, MARGIN, doc.y, { width: PAGE_WIDTH - MARGIN * 2 });
      }

      doc.end();
    });
  }
}

function rowLine(doc: PDFKit.PDFDocument, label: string, value: string, margin: number, bold = false) {
  const y = doc.y;
  doc.fontSize(bold ? 13 : 10).fillColor(bold ? "#1c1917" : INK);
  doc.text(label, margin, y, { continued: false, width: 350 });
  doc.text(value, margin + 350, y, { width: 145, align: "right" });
}
