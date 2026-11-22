import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const schema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  windowStart: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> =
  (models.RateLimit as Model<IRateLimit>) ?? model<IRateLimit>("RateLimit", schema);
