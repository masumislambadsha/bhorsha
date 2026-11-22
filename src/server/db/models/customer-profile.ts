import "server-only";

import { Schema, model, models, type Model } from "mongoose";
import { CUSTOMER_STATUSES, KYC_STATUSES } from "@/lib/domain";

export interface IPin {
  hash: string;
  setAt: Date;
  failedAttempts: number;
  lockedUntil?: Date | null;
}

export interface ICustomerProfile {
  userId: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  occupation?: string;
  kycStatus: (typeof KYC_STATUSES)[number];
  kycNote?: string;
  kycReviewedBy?: string;
  kycReviewedAt?: Date;
  status: (typeof CUSTOMER_STATUSES)[number];
  statusReason?: string;
  pin?: IPin;
  registeredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const pinSchema = new Schema<IPin>(
  {
    hash: { type: String, required: true },
    setAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { _id: false },
);

const schema = new Schema<ICustomerProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    address: { type: String },
    dateOfBirth: { type: Date },
    occupation: { type: String },
    kycStatus: { type: String, enum: KYC_STATUSES, default: "pending", required: true },
    kycNote: { type: String },
    kycReviewedBy: { type: String },
    kycReviewedAt: { type: Date },
    status: { type: String, enum: CUSTOMER_STATUSES, default: "active", required: true },
    statusReason: { type: String },
    pin: { type: pinSchema, select: false, default: undefined },
    registeredBy: { type: String, default: null },
  },
  { timestamps: true },
);

schema.index({ kycStatus: 1, createdAt: -1 });
schema.index({ status: 1 });

export const CustomerProfile: Model<ICustomerProfile> =
  (models.CustomerProfile as Model<ICustomerProfile>) ??
  model<ICustomerProfile>("CustomerProfile", schema);
