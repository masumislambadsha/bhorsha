import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { EMPLOYMENT_STATUSES, LOAN_STATUSES, LOAN_TYPES } from "@/lib/domain";

export interface IInstallment {
  n: number;
  dueDate: Date;
  principalMinor: number;
  interestMinor: number;
  amountDueMinor: number;
  status: "due" | "paid";
  paidAt?: Date;
  transactionId?: Types.ObjectId;
}

export interface IRepayment {
  transactionId: Types.ObjectId;
  amountMinor: number;
  installments: number[];
  paidAt: Date;
}

export interface ILoanNote {
  authorId: string;
  authorRole: string;
  body: string;
  createdAt: Date;
}

export interface ILoan {
  _id: Types.ObjectId;
  applicantId: string;
  loanType: (typeof LOAN_TYPES)[number];
  principalMinor: number;
  durationMonths: number;
  annualRateBps: number;
  monthlyIncomeMinor: number;
  employmentStatus: (typeof EMPLOYMENT_STATUSES)[number];
  description: string;
  disbursementAccountId: Types.ObjectId;
  status: (typeof LOAN_STATUSES)[number];
  emiMinor?: number;
  totalInterestMinor?: number;
  totalPayableMinor?: number;
  outstandingMinor: number;
  debtToIncome: number;
  schedule: IInstallment[];
  repayments: IRepayment[];
  notes: ILoanNote[];
  forwarded?: { by: string; at: Date; recommendation: "approve" | "reject"; note: string };
  decision?: { by: string; at: Date; reason?: string };
  disbursement?: { by: string; at: Date; transactionId: Types.ObjectId };
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const installmentSchema = new Schema<IInstallment>(
  {
    n: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principalMinor: { type: Number, required: true },
    interestMinor: { type: Number, required: true },
    amountDueMinor: { type: Number, required: true },
    status: { type: String, enum: ["due", "paid"], default: "due", required: true },
    paidAt: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { _id: false },
);

const repaymentSchema = new Schema<IRepayment>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true },
    amountMinor: { type: Number, required: true },
    installments: { type: [Number], default: [] },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const noteSchema = new Schema<ILoanNote>(
  {
    authorId: { type: String, required: true },
    authorRole: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schema = new Schema<ILoan>(
  {
    applicantId: { type: String, required: true },
    loanType: { type: String, enum: LOAN_TYPES, required: true },
    principalMinor: { type: Number, required: true, min: 1, validate: Number.isInteger },
    durationMonths: { type: Number, required: true, min: 1 },
    annualRateBps: { type: Number, required: true, min: 0 },
    monthlyIncomeMinor: { type: Number, required: true, min: 0 },
    employmentStatus: { type: String, enum: EMPLOYMENT_STATUSES, required: true },
    description: { type: String, required: true, minlength: 20, maxlength: 500 },
    disbursementAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    status: { type: String, enum: LOAN_STATUSES, default: "pending", required: true },
    emiMinor: { type: Number },
    totalInterestMinor: { type: Number },
    totalPayableMinor: { type: Number },
    outstandingMinor: { type: Number, default: 0 },
    debtToIncome: { type: Number, default: 0 },
    schedule: { type: [installmentSchema], default: [] },
    repayments: { type: [repaymentSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    forwarded: {
      by: { type: String },
      at: { type: Date },
      recommendation: { type: String, enum: ["approve", "reject"] },
      note: { type: String },
      _id: false,
    },
    decision: { by: { type: String }, at: { type: Date }, reason: { type: String }, _id: false },
    disbursement: {
      by: { type: String },
      at: { type: Date },
      transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
      _id: false,
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

schema.index({ applicantId: 1 });
schema.index({ status: 1, createdAt: -1 });

export const Loan: Model<ILoan> = (models.Loan as Model<ILoan>) ?? model<ILoan>("Loan", schema);
