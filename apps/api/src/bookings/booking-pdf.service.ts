import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";

// Colors mirror the web app's "African savanna" theme and the proposal PDF
// — see proposal-pdf.service.ts for why a flat-fill header band instead of
// a gradient, and why pdfkit over a headless-browser renderer.
const CLAY_700 = "#853d20";
const CLAY_800 = "#66301c";
const ACACIA_700 = "#375228";
const SUNSET_300 = "#f2c866";
const INK = "#292524";
const MUTED = "#78716c";
const FAINT = "#a8a29e";
const RULE = "#e7d9cb";

export interface BookingPdfTraveler {
  fullName: string;
}

export interface BookingPdfPayment {
  amount: string | number;
  method: string;
  reference?: string | null;
  createdAt: Date | string;
}

export interface BookingPdfInput {
  ticketToken: string;
  status: string;
  currency: string;
  totalPrice: string | number;
  amountPaid: string | number;
  contactName: string;
  travelers: BookingPdfTraveler[];
  payments: BookingPdfPayment[];
  itinerary?: { title?: string | null; days: { dayNumber: number; title: string; place?: { name: string } | null }[] } | null;
}

@Injectable()
export class BookingPdfService {
  constructor(private readonly config: ConfigService) {}

  private statusUrl(token: string) {
    const base = this.config.get<string>("WEB_APP_URL") ?? "http://localhost:5173";
    return `${base}/booking/${token}`;
  }

  // A running receipt of every payment recorded to date, plus the balance
  // still due — the "invoice/receipt" the Phase 2 gate calls for. Not tied
  // to one payment: an admin or client can pull this any time to see where
  // things stand.
  async renderReceipt(input: BookingPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const MARGIN = 50;
      const WIDTH = doc.page.width;

      doc.rect(0, 0, WIDTH, 100).fill(CLAY_800);
      doc.rect(0, 100, WIDTH, 3).fill(SUNSET_300);
      doc.fillColor(SUNSET_300).fontSize(9).text("SAFARI JUNCTION'S ADVENTURES", MARGIN, 26, { characterSpacing: 1.5 });
      doc.fillColor("#ffffff").fontSize(20).text("Payment receipt", MARGIN, 40);
      doc.fillColor("#ffffff").opacity(0.85).fontSize(11).text(`${input.contactName} · Booking ${input.ticketToken.slice(0, 10)}…`, MARGIN, 68);
      doc.opacity(1);

      let y = 125;
      doc.fillColor(CLAY_700).fontSize(13).text("Payments received", MARGIN, y);
      y += 22;
      const total = Number(input.totalPrice);
      const paid = Number(input.amountPaid);
      for (const p of input.payments) {
        doc.fontSize(10).fillColor(INK).text(new Date(p.createdAt).toLocaleDateString(), MARGIN, y, { width: 100 });
        doc.text(p.method.replace(/_/g, " "), MARGIN + 100, y, { width: 150 });
        doc.text(p.reference ?? "—", MARGIN + 250, y, { width: 145 });
        doc.text(`${input.currency} ${Number(p.amount).toLocaleString()}`, MARGIN + 395, y, { width: 100, align: "right" });
        y += 18;
      }
      if (input.payments.length === 0) {
        doc.fontSize(10).fillColor(FAINT).text("No payments recorded yet.", MARGIN, y);
        y += 18;
      }

      y += 8;
      doc.moveTo(MARGIN, y).lineTo(WIDTH - MARGIN, y).strokeColor(RULE).lineWidth(1.5).stroke();
      y += 12;

      doc.fontSize(10).fillColor(MUTED).text("Total price", MARGIN, y, { width: 300 });
      doc.text(`${input.currency} ${total.toLocaleString()}`, MARGIN + 300, y, { width: 195, align: "right" });
      y += 16;
      doc.fillColor(MUTED).text("Paid to date", MARGIN, y, { width: 300 });
      doc.text(`${input.currency} ${paid.toLocaleString()}`, MARGIN + 300, y, { width: 195, align: "right" });
      y += 20;
      doc.fontSize(12).fillColor(CLAY_700).text("Balance due", MARGIN, y, { width: 300 });
      doc.text(`${input.currency} ${(total - paid).toLocaleString()}`, MARGIN + 300, y, { width: 195, align: "right" });

      doc.end();
    });
  }

  // A QR e-ticket — only meaningful once the booking is fully PAID. The QR
  // encodes the public trip-status page (no login needed — §5), which
  // always reflects the current status rather than a static "confirmed"
  // claim baked into the PDF.
  async renderETicket(input: BookingPdfInput): Promise<Buffer> {
    const qrDataUrl = await QRCode.toDataURL(this.statusUrl(input.ticketToken), { margin: 1, width: 220 });
    const qrPng = Buffer.from(qrDataUrl.split(",")[1], "base64");

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const MARGIN = 50;
      const WIDTH = doc.page.width;

      doc.rect(0, 0, WIDTH, 100).fill(CLAY_800);
      doc.rect(0, 100, WIDTH, 3).fill(SUNSET_300);
      doc.fillColor(SUNSET_300).fontSize(9).text("SAFARI JUNCTION'S ADVENTURES", MARGIN, 26, { characterSpacing: 1.5 });
      doc.fillColor("#ffffff").fontSize(20).text("Your safari e-ticket", MARGIN, 40);
      doc.fillColor("#ffffff").opacity(0.85).fontSize(11).text(input.contactName, MARGIN, 68);
      doc.opacity(1);

      doc.image(qrPng, WIDTH - MARGIN - 110, 130, { width: 110 });
      doc.fontSize(8).fillColor(FAINT).text("Scan to check trip status", WIDTH - MARGIN - 110, 244, { width: 110, align: "center" });

      let y = 135;
      doc.fillColor(ACACIA_700).fontSize(11).text(`Status: ${input.status}`, MARGIN, y);
      y += 24;

      if (input.itinerary?.title) {
        doc.fontSize(13).fillColor(CLAY_700).text(input.itinerary.title, MARGIN, y, { width: 320 });
        y += 22;
      }

      doc.fontSize(10).fillColor(INK).text("Travelers", MARGIN, y);
      y += 16;
      for (const t of input.travelers) {
        doc.fontSize(10).fillColor(MUTED).text(`• ${t.fullName}`, MARGIN, y, { width: 320 });
        y += 15;
      }
      if (input.travelers.length === 0) {
        doc.fontSize(10).fillColor(FAINT).text("No travelers added yet.", MARGIN, y, { width: 320 });
        y += 15;
      }

      y = Math.max(y, 270) + 20;
      doc.moveTo(MARGIN, y).lineTo(WIDTH - MARGIN, y).strokeColor(RULE).lineWidth(1.5).stroke();
      y += 16;

      if (input.itinerary?.days.length) {
        doc.fontSize(13).fillColor(CLAY_700).text("Itinerary", MARGIN, y);
        y += 20;
        for (const d of input.itinerary.days) {
          doc.fontSize(10).fillColor(INK).text(`Day ${d.dayNumber}: ${d.title}`, MARGIN, y, { width: WIDTH - MARGIN * 2 });
          y += 14;
          if (d.place) {
            doc.fontSize(9).fillColor(ACACIA_700).text(d.place.name, MARGIN, y, { width: WIDTH - MARGIN * 2 });
            y += 14;
          }
        }
      }

      doc.fontSize(8).fillColor(FAINT).text(`Ticket ${input.ticketToken}`, MARGIN, doc.page.height - 40);

      doc.end();
    });
  }
}
