import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from "@/lib/domain";

export interface ILimits {
  perTransactionMinor: number;
  dailyTransferMinor: number;
  minimumBalanceMinor: number;
}

export interface IBankAccount {
  _id: Types.ObjectId;
  accountNumber: string;
  kind: "customer" | "system";
  systemCode?: string;
  ownerId: string | null;
  type: (typeof ACCOUNT_TYPES)[number];
  nickname?: string;
  currency: "BDT";
  balanceMinor: number;
  holdMinor: number;
  status: (typeof ACCOUNT_STATUSES)[number];
  statusReason?: string;
  statusChangedBy?: string;
  statusChangedAt?: Date;
  limits: ILimits;
  dailyOutflow: { date: string; amountMinor: number };
  openedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const limitsSchema = new Schema<ILimits>(
  {
    perTransactionMinor: { type: Number, required: true, min: 0 },
    dailyTransferMinor: { type: Number, required: true, min: 0 },
    minimumBalanceMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const schema = new Schema<IBankAccount>(
  {
    accountNumber: { type: String, required: true, unique: true, minlength: 12, maxlength: 12 },
    kind: { type: String, enum: ["customer", "system"], required: true },
    systemCode: { type: String, unique: true, sparse: true },
    ownerId: { type: String, default: null },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    nickname: { type: String },
    currency: { type: String, enum: ["BDT"], default: "BDT", required: true },
    balanceMinor: { type: Number, required: true, default: 0, validate: Number.isInteger },
    holdMinor: { type: Number, required: true, default: 0, min: 0, validate: Number.isInteger },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "active", required: true },
    statusReason: { type: String },
    statusChangedBy: { type: String },
    statusChangedAt: { type: Date },
    limits: { type: limitsSchema, required: true },
    dailyOutflow: {
      date: { type: String, default: "" },
      amountMinor: { type: Number, default: 0, min: 0 },
      _id: false,
    },
    openedBy: { type: String },
  },
  { timestamps: true },
);

schema.index({ ownerId: 1 });
schema.index({ status: 1 });
schema.index({ type: 1 });

export const BankAccount: Model<IBankAccount> =
  (models.BankAccount as Model<IBankAccount>) ?? model<IBankAccount>("BankAccount", schema);
