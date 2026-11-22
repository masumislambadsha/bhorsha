import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ILedgerEntry {
  transactionId: Types.ObjectId;
  accountId: Types.ObjectId;
  direction: "debit" | "credit";
  amountMinor: number;
  balanceAfterMinor: number;
  entryType: "principal" | "fee" | "reversal";
  createdAt: Date;
}

const schema = new Schema<ILedgerEntry>({
  transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true },
  accountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
  direction: { type: String, enum: ["debit", "credit"], required: true },
  amountMinor: { type: Number, required: true, min: 0, validate: Number.isInteger },
  balanceAfterMinor: { type: Number, required: true, validate: Number.isInteger },
  entryType: { type: String, enum: ["principal", "fee", "reversal"], required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

schema.index({ accountId: 1, createdAt: 1 });
schema.index({ transactionId: 1 });

function appendOnly(): never {
  throw new Error("Ledger entries are append-only.");
}

for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const) {
  schema.pre(operation, function () {
    appendOnly();
  });
}

export const LedgerEntry: Model<ILedgerEntry> =
  (models.LedgerEntry as Model<ILedgerEntry>) ?? model<ILedgerEntry>("LedgerEntry", schema);
