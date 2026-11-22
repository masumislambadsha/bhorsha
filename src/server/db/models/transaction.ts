import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { APP_ROLES, FLAG_SEVERITIES, FLAG_STATUSES, TX_STATUSES, TX_TYPES } from "@/lib/domain";

export interface IFlag {
  source: "rule" | "staff";
  rule?: string;
  severity: (typeof FLAG_SEVERITIES)[number];
  reason: string;
  raisedBy?: string;
  raisedAt: Date;
  status: (typeof FLAG_STATUSES)[number];
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface ITransaction {
  _id: Types.ObjectId;
  reference: string;
  type: (typeof TX_TYPES)[number];
  status: (typeof TX_STATUSES)[number];
  amountMinor: number;
  feeMinor: number;
  fromAccountId?: Types.ObjectId;
  toAccountId?: Types.ObjectId;
  fromAccountNumber?: string;
  toAccountNumber?: string;
  fromOwnerId?: string;
  toOwnerId?: string;
  initiatedBy?: string;
  initiatedByRole?: (typeof APP_ROLES)[number];
  description?: string;
  idempotencyKey?: string;
  requestHash?: string;
  requestId?: string;
  loanId?: Types.ObjectId;
  failureCode?: string;
  failureReason?: string;
  review: {
    required: boolean;
    reason?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
    decision?: string;
    note?: string;
  };
  flags: IFlag[];
  flagStatus: "none" | "open" | "resolved";
  reversal?: { by: string; at: Date; reason: string };
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const flagSchema = new Schema<IFlag>(
  {
    source: { type: String, enum: ["rule", "staff"], required: true },
    rule: { type: String },
    severity: { type: String, enum: FLAG_SEVERITIES, required: true },
    reason: { type: String, required: true },
    raisedBy: { type: String },
    raisedAt: { type: Date, default: Date.now, required: true },
    status: { type: String, enum: FLAG_STATUSES, default: "open", required: true },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    resolution: { type: String },
  },
  { _id: false },
);

const schema = new Schema<ITransaction>(
  {
    reference: { type: String, required: true, unique: true },
    type: { type: String, enum: TX_TYPES, required: true },
    status: { type: String, enum: TX_STATUSES, required: true },
    amountMinor: { type: Number, required: true, min: 0, validate: Number.isInteger },
    feeMinor: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    fromAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    toAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    fromAccountNumber: { type: String },
    toAccountNumber: { type: String },
    fromOwnerId: { type: String },
    toOwnerId: { type: String },
    initiatedBy: { type: String },
    initiatedByRole: { type: String, enum: APP_ROLES },
    description: { type: String, maxlength: 500 },
    idempotencyKey: { type: String },
    requestHash: { type: String },
    requestId: { type: String },
    loanId: { type: Schema.Types.ObjectId, ref: "Loan" },
    failureCode: { type: String },
    failureReason: { type: String },
    review: {
      required: { type: Boolean, default: false },
      reason: { type: String },
      reviewedBy: { type: String },
      reviewedAt: { type: Date },
      decision: { type: String },
      note: { type: String },
      _id: false,
    },
    flags: { type: [flagSchema], default: [] },
    flagStatus: { type: String, enum: ["none", "open", "resolved"], default: "none" },
    reversal: {
      by: { type: String },
      at: { type: Date },
      reason: { type: String },
      _id: false,
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

schema.index(
  { initiatedBy: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);
schema.index({ fromAccountId: 1, createdAt: -1 });
schema.index({ toAccountId: 1, createdAt: -1 });
schema.index({ status: 1 });
schema.index({ type: 1 });
schema.index({ flagStatus: 1 });
schema.index({ createdAt: -1 });

export const TransactionModel: Model<ITransaction> =
  (models.Transaction as Model<ITransaction>) ?? model<ITransaction>("Transaction", schema);
