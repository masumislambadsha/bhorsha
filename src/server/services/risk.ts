import "server-only";

import type { IBankAccount, IBankSettings } from "@/server/db/models";
import { TransactionModel } from "@/server/db/models";
import { formatBDT } from "@/lib/money";
import { dhakaHour } from "@/lib/time";

export interface RiskFlag {
  rule: string;
  reason: string;
  severity: "medium" | "high";
}

/** §8.7 risk rules, using thresholds from settings. */
export async function evaluateRisk(
  settings: IBankSettings["risk"],
  sender: IBankAccount,
  availableMinor: number,
  recipient: IBankAccount,
  amountMinor: number,
  now: Date,
): Promise<RiskFlag[]> {
  const flags: RiskFlag[] = [];
  const push = (rule: string, severity: RiskFlag["severity"], reason: string) => flags.push({ rule, reason, severity });

  if (amountMinor >= settings.highValueMinor) {
    push("high_value", "medium", `Transfer of ${formatBDT(amountMinor)} is high value.`);
  }

  const since = new Date(now.getTime() - settings.velocityWindowMinutes * 60_000);
  const velocity = await TransactionModel.countDocuments({
    fromAccountId: sender._id,
    type: "transfer",
    status: { $in: ["completed", "pending"] },
    createdAt: { $gte: since },
  });
  if (velocity > settings.velocityCount) {
    push("velocity", "high", `${velocity} transfers in the last ${settings.velocityWindowMinutes} minutes.`);
  }

  const firstToRecipient = await TransactionModel.findOne({
    toAccountId: recipient._id,
    type: "transfer",
    status: { $ne: "failed" },
  }).lean();
  if (!firstToRecipient && availableMinor > 0) {
    const ratio = amountMinor / availableMinor;
    if (ratio >= settings.newPayeeRatio && amountMinor >= settings.newPayeeMinMinor) {
      push("new_payee_large", "medium", `First transfer to ${recipient.accountNumber} is a large portion of your balance.`);
    }
  }

  const hour = dhakaHour(now);
  if (hour >= settings.oddHoursStart && hour <= settings.oddHoursEnd && amountMinor >= settings.oddHoursMinMinor) {
    push("odd_hours", "medium", "Transfer during unusual hours.");
  }
  return flags;
}
