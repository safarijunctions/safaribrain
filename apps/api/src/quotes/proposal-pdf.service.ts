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
@Injectable()
export class ProposalPdfService {
  render(input: ProposalPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fillColor("#7d4f17").fontSize(10).text("SAFARI JUNCTION'S ADVENTURES", { characterSpacing: 1 });
      doc.fillColor("#1c1917").fontSize(20).text("Your safari proposal", { paragraphGap: 4 });
      doc.fillColor("#57534e").fontSize(11).text(`Prepared for ${input.contactName}`);
      doc.moveDown(1.2);

      if (input.itinerary?.days.length) {
        doc.fillColor("#1c1917").fontSize(14).text("Itinerary");
        doc.moveDown(0.3);
        for (const day of input.itinerary.days) {
          doc.fontSize(11).fillColor("#1c1917").text(`Day ${day.dayNumber}: ${day.title}`);
          if (day.place) doc.fontSize(9).fillColor("#78716c").text(day.place.name);
          doc.fontSize(9).fillColor("#a8a29e").text(`Meals: ${day.mealsIncluded.join(", ") || "—"}`);
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);
      }

      doc.fillColor("#1c1917").fontSize(14).text("Price");
      doc.moveDown(0.3);
      const { breakdown } = input;
      for (const line of breakdown.costLines) {
        rowLine(doc, line.label, `${line.currency} ${(line.quantity * line.unitCost).toLocaleString()}`);
      }
      if (breakdown.discountAmount > 0) rowLine(doc, "Discount", `-${breakdown.currency} ${breakdown.discountAmount.toLocaleString()}`);
      if (breakdown.taxAmount > 0) rowLine(doc, `Tax (${breakdown.taxPercent}%)`, `${breakdown.currency} ${breakdown.taxAmount.toLocaleString()}`);
      doc.moveDown(0.2);
      doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor("#d6d3d1").stroke();
      doc.moveDown(0.3);
      doc.fontSize(13).fillColor("#1c1917");
      rowLine(doc, "Total", `${breakdown.currency} ${breakdown.totalClientPrice.toLocaleString()}`, true);
      doc.moveDown(0.6);

      if (breakdown.feeSourcesAsOf.length) {
        doc
          .fontSize(8)
          .fillColor("#a8a29e")
          .text(
            `Park fees shown as of ${breakdown.feeSourcesAsOf.map((f) => new Date(f.asOfDate).toLocaleDateString()).join(", ")} — official published rates, subject to change by the relevant park authority before booking is confirmed.`,
          );
        doc.moveDown(0.4);
      }

      if (input.isFrozen) {
        doc.fontSize(9).fillColor("#15803d").text("This price is confirmed and locked in for your booking — it will not change.");
        doc.moveDown(0.4);
      }

      if (input.itinerary?.termsMarkdown) {
        doc.moveDown(0.4);
        doc.fontSize(11).fillColor("#1c1917").text("Terms");
        doc.fontSize(9).fillColor("#57534e").text(input.itinerary.termsMarkdown);
      }

      doc.end();
    });
  }
}

function rowLine(doc: PDFKit.PDFDocument, label: string, value: string, bold = false) {
  const y = doc.y;
  doc.fontSize(bold ? 12 : 10).fillColor("#1c1917");
  doc.text(label, 50, y, { continued: false, width: 350 });
  doc.text(value, 400, y, { width: 145, align: "right" });
}
