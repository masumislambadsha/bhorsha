import "server-only";

import type { ClientSession } from "mongoose";
import { toMinor } from "@/lib/money";
import { BankSettings, type IBankSettings } from "@/server/db/models";

export const DEFAULT_SETTINGS: Omit<IBankSettings, "updatedAt"> = {
  key: "default",
  limits: {
    savings: {
      perTransactionMinor: toMinor("100000.00"),
      dailyTransferMinor: toMinor("200000.00"),
      minimumBalanceMinor: toMinor("500.00"),
    },
    current: {
      perTransactionMinor: toMinor("500000.00"),
      dailyTransferMinor: toMinor("1000000.00"),
      minimumBalanceMinor: toMinor("1000.00"),
    },
    business: {
      perTransactionMinor: toMinor("2000000.00"),
      dailyTransferMinor: toMinor("5000000.00"),
      minimumBalanceMinor: toMinor("5000.00"),
    },
  },
  transferFeeMinor: toMinor("10.00"),
  reviewThresholdMinor: toMinor("500000.00"),
  staffApprovalLimitMinor: toMinor("500000.00"),
  loanProducts: {
    personal: { annualRateBps: 1200, minMonths: 6, maxMonths: 60, maxPrincipalMinor: toMinor("1000000.00") },
    home: { annualRateBps: 900, minMonths: 12, maxMonths: 240, maxPrincipalMinor: toMinor("10000000.00") },
    car: { annualRateBps: 1050, minMonths: 12, maxMonths: 84, maxPrincipalMinor: toMinor("3000000.00") },
    education: { annualRateBps: 800, minMonths: 6, maxMonths: 84, maxPrincipalMinor: toMinor("1500000.00") },
    business: { annualRateBps: 1300, minMonths: 6, maxMonths: 60, maxPrincipalMinor: toMinor("5000000.00") },
  },
  risk: {
    highValueMinor: toMinor("200000.00"),
    velocityCount: 5,
    velocityWindowMinutes: 10,
    newPayeeRatio: 0.5,
    newPayeeMinMinor: toMinor("50000.00"),
    oddHoursStart: 0,
    oddHoursEnd: 5,
    oddHoursMinMinor: toMinor("50000.00"),
  },
};

/** Read bank settings, seeding the singleton on first access. */
export async function getSettings(session?: ClientSession): Promise<IBankSettings> {
  const existing = await BankSettings.findOne({ key: "default" }).session(session ?? null).lean();
  if (existing) return existing as IBankSettings;
  await BankSettings.updateOne(
    { key: "default" },
    { $setOnInsert: { ...DEFAULT_SETTINGS, updatedAt: new Date() } },
    { upsert: true, session },
  );
  const created = await BankSettings.findOne({ key: "default" }).session(session ?? null).lean();
  return created as IBankSettings;
}

export async function ensureSettings(): Promise<void> {
  await getSettings();
}
