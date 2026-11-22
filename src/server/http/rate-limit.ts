import "server-only";

import { RateLimit } from "@/server/db/models";
import { AppError } from "./errors";

export interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
}

const WINDOWS: Record<string, RateLimitRule> = {
  transfer: { key: "transfer", limit: 10, windowMs: 60_000 },
  repayment: { key: "repayment", limit: 10, windowMs: 60_000 },
  lookup: { key: "lookup", limit: 30, windowMs: 60_000 },
  pin: { key: "pin", limit: 5, windowMs: 3_600_000 },
  loan: { key: "loan", limit: 5, windowMs: 86_400_000 },
  request: { key: "request", limit: 20, windowMs: 86_400_000 },
};

export async function enforceRateLimit(name: keyof typeof WINDOWS, userId: string): Promise<void> {
  const rule = WINDOWS[name];
  const now = new Date();
  await RateLimit.deleteMany({ key: `${rule.key}:${userId}`, expiresAt: { $lte: now } });
  const record = await RateLimit.findOneAndUpdate(
    { key: `${rule.key}:${userId}` },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expiresAt: new Date(now.getTime() + rule.windowMs) },
    },
    { upsert: true, new: true },
  ).lean();
  if (record && record.count > rule.limit) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again in a little while.");
  }
}
