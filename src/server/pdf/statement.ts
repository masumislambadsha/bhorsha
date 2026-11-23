import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { APP_NAME } from "@/config/app";
import { fromMinor } from "@/lib/money";
import type { StatementData } from "@/server/services/statement";

/** §8.11: paged A4 statement with page numbers, Helvetica and "BDT" amounts. */
export async function buildStatementPdf(data: StatementData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const small = await doc.embedFont(StandardFonts.Helvetica);
  const width = 595.28;
  const height = 841.89;
  const margin = 40;
  const rowHeight = 16;
  const rowsPerPage = Math.floor((height - 220) / rowHeight);
  const pages: { page: ReturnType<typeof doc.addPage>; start: number }[] = [];
  for (let i = 0; i < data.rows.length; i += rowsPerPage) {
    const page = doc.addPage([width, height]);
    pages.push({ page, start: i });
  }
  if (pages.length === 0) pages.push({ page: doc.addPage([width, height]), start: 0 });

  pages.forEach(({ page, start }, pageIndex) => {
    let y = height - margin;
    const text = (value: string, x: number, yPos: number, size = 9, fontRef = font) => {
      page.drawText(value, { x, y: yPos, size, font: fontRef, color: rgb(0.1, 0.1, 0.1) });
    };
    text(`${APP_NAME} — Account statement`, margin, y, 16, bold);
    y -= 22;
    if (pageIndex === 0) {
      text(`Account: ${data.account.number} (${data.account.type})`, margin, y); y -= 13;
      text(`Customer: ${data.customerName}`, margin, y); y -= 13;
      text(`Period: ${data.from} to ${data.to}`, margin, y); y -= 13;
      text(`Opening balance: BDT ${fromMinor(data.openingBalanceMinor)}`, margin, y); y -= 13;
      text(`Closing balance: BDT ${fromMinor(data.closingBalanceMinor)}`, margin, y); y -= 13;
      text(`Debits: BDT ${fromMinor(data.totalDebitsMinor)}   Credits: BDT ${fromMinor(data.totalCreditsMinor)}`, margin, y); y -= 13;
      y -= 6;
      text("Date", margin, y, 9, bold);
      text("Reference", margin + 70, y, 9, bold);
      text("Description", margin + 190, y, 9, bold);
      text("Debit", margin + 320, y, 9, bold);
      text("Credit", margin + 390, y, 9, bold);
      text("Balance", margin + 460, y, 9, bold);
      y -= 16;
    }
    for (const row of data.rows.slice(start, start + rowsPerPage)) {
      if (y < margin + 20) break;
      text(row.date, margin, y, 8, small);
      text(row.reference.slice(0, 18), margin + 70, y, 8, small);
      text(row.description.slice(0, 40), margin + 190, y, 8, small);
      text(row.debitMinor ? fromMinor(row.debitMinor) : "", margin + 320, y, 8, small);
      text(row.creditMinor ? fromMinor(row.creditMinor) : "", margin + 390, y, 8, small);
      text(fromMinor(row.balanceMinor), margin + 460, y, 8, small);
      y -= rowHeight;
    }
    text(`Page ${pageIndex + 1} of ${pages.length}`, margin, margin - 10, 8, small);
    text("Simulated statement — no real money moved.", margin, 14, 8, small);
  });

  return doc.save();
}
