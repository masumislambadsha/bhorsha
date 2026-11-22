import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { REQUEST_STATUSES } from "@/lib/domain";

export interface IDepositWithdrawalRequest {
  _id: Types.ObjectId;
  kind: "deposit" | "withdrawal";
  accountId: Types.ObjectId;
  customerId: string;
  amountMinor: number;
  description?: string;
  status: (typeof REQUEST_STATUSES)[number];
  holdMinor: number;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  rejectionReason?: string;
  transactionId?: Types.ObjectId;
  requestDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDepositWithdrawalRequest>(
  {
    kind: { type: String, enum: ["deposit", "withdrawal"], required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    customerId: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isInteger },
    description: { type: String, maxlength: 500 },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending", required: true },
    holdMinor: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    rejectionReason: { type: String },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    requestDate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

schema.index({ status: 1, createdAt: -1 });
schema.index({ customerId: 1 });
schema.index({ accountId: 1 });

export const DepositWithdrawalRequest: Model<IDepositWithdrawalRequest> =
  (models.DepositWithdrawalRequest as Model<IDepositWithdrawalRequest>) ??
  model<IDepositWithdrawalRequest>("DepositWithdrawalRequest", schema);
