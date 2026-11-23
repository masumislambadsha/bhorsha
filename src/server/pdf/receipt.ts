import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { APP_NAME } from "@/config/app";
import { formatDateTime } from "@/lib/time";
import { fromMinor } from "@/lib/money";
import type { ITransaction } from "@/server/db/models";

export interface ReceiptAddress {
  holderName: string;
  accountNumber: string;
}

/**
 * A4 page (595.28 x 841.89), Helvetica, "BDT" amounts. Includes the bank name,
 * the reference, the fields, a generated-at time, and the simulation notice line.
 */
export async function buildReceiptPdf(transaction: ITransaction, sender: ReceiptAddress, receiver: ReceiptAddress): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 810;
  const draw = (text: string, size: number, bold = false, right = false) => {
    const x = right ? 420 : 60;
    page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
  };
  const row = (label: string, value: string) => {
    draw(label, 12);
    draw(value, 12, false, true);
    y -= 17;
  };
  const total = transaction.amountMinor + (transaction.feeMinor ?? 0);

  draw(`${APP_NAME} — Transaction Receipt`, 16, true);
  y -= 24;
  row("Reference", transaction.reference);
  row("Date & time (Asia/Dhaka)", formatDateTime(transaction.createdAt ?? new Date()));
  row("Type", transaction.type.replace("_", " "));
  row("Status", transaction.status);
  row("From", sender.holderName);
  row("From account", sender.accountNumber);
  row("To", receiver.holderName);
  row("To account", receiver.accountNumber);
  row("Amount", `BDT ${fromMinor(transaction.amountMinor)}`);
  row("Fee", `BDT ${fromMinor(transaction.feeMinor ?? 0)}`);
  row("Total", `BDT ${fromMinor(total)}`);
  row("Description", transaction.description ?? "—");
  y -= 4;
  draw("Simulated transaction — no real money moved.", 9);

  return pdfDoc.save();
}
