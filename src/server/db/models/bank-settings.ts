import "server-only";

import { Schema, model, models, type Model } from "mongoose";
import type { AccountType, LoanType } from "@/lib/domain";
import type { ILimits } from "./bank-account";

export interface LoanProduct {
  annualRateBps: number;
  minMonths: number;
  maxMonths: number;
  maxPrincipalMinor: number;
}

export interface IRiskSettings {
  highValueMinor: number;
  velocityCount: number;
  velocityWindowMinutes: number;
  newPayeeRatio: number;
  newPayeeMinMinor: number;
  oddHoursStart: number;
  oddHoursEnd: number;
  oddHoursMinMinor: number;
}

export interface IBankSettings {
  key: "default";
  limits: Record<AccountType, ILimits>;
  transferFeeMinor: number;
  reviewThresholdMinor: number;
  staffApprovalLimitMinor: number;
  loanProducts: Record<LoanType, LoanProduct>;
  risk: IRiskSettings;
  updatedBy?: string;
  updatedAt: Date;
}

const schema = new Schema<IBankSettings>({
  key: { type: String, enum: ["default"], default: "default", unique: true, required: true },
  limits: { type: Schema.Types.Mixed, required: true },
  transferFeeMinor: { type: Number, required: true, min: 0 },
  reviewThresholdMinor: { type: Number, required: true, min: 0 },
  staffApprovalLimitMinor: { type: Number, required: true, min: 0 },
  loanProducts: { type: Schema.Types.Mixed, required: true },
  risk: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export const BankSettings: Model<IBankSettings> =
  (models.BankSettings as Model<IBankSettings>) ?? model<IBankSettings>("BankSettings", schema);
