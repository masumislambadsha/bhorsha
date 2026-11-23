import { z } from "zod";
import { AuthUser, BankAccount } from "@/server/db/models";
import { findAuthUserById } from "@/server/db/models/user";
import { withHandler } from "@/server/http/handler";
import { buildReceiptPdf } from "@/server/pdf/receipt";
import { maskName } from "@/server/services/accounts";
import { getTransactionDocument } from "@/server/services/transactions";

export const GET = withHandler(
  { params: z.object({ idOrReference: z.string().min(1) }) },
  async ({ actor, params }) => {
    const doc = await getTransactionDocument(actor, params.idOrReference);

    const senderDoc = doc.fromAccountNumber ? await BankAccount.findOne({ accountNumber: doc.fromAccountNumber }).select("ownerId").lean() : null;
    const receiverDoc = doc.toAccountNumber ? await BankAccount.findOne({ accountNumber: doc.toAccountNumber }).select("ownerId").lean() : null;
    const sender = senderDoc?.ownerId ? await findAuthUserById(String(senderDoc.ownerId)) : null;
    const receiver = receiverDoc?.ownerId ? await findAuthUserById(String(receiverDoc.ownerId)) : null;

    const pdf = await buildReceiptPdf(
      doc,
      { holderName: sender ? maskName(sender.name ?? "") : (doc.fromAccountNumber ?? "Unknown"), accountNumber: doc.fromAccountNumber ?? "" },
      { holderName: receiver ? maskName(receiver.name ?? "") : (doc.toAccountNumber ?? "Unknown"), accountNumber: doc.toAccountNumber ?? "" },
    );
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${doc.reference}.pdf"`,
      },
    });
  },
);
