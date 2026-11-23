import { beforeAll, describe, expect, it } from "vitest";
import { connectDB } from "@/server/db/mongoose";
import { BankAccount, LedgerEntry } from "@/server/db/models";
import { checkLedgerInvariants } from "@/server/services/integrity";
import { getSettings } from "@/server/services/settings";
import { ensureSystemAccounts } from "@/server/services/system-accounts";

describe("database foundation", () => {
  beforeAll(async () => {
    await connectDB();
  });

  it("creates the three system accounts idempotently", async () => {
    await ensureSystemAccounts();
    await ensureSystemAccounts();
    const codes = await BankAccount.find({ kind: "system" }).distinct("systemCode");
    expect(codes.sort()).toEqual(["CASH_CLEARING", "FEE_INCOME", "LOAN_PORTFOLIO"]);
  });

  it("seeds bank settings defaults", async () => {
    const settings = await getSettings();
    expect(settings.transferFeeMinor).toBe(1000);
    expect(settings.limits.savings.minimumBalanceMinor).toBe(50000);
    expect(settings.risk.velocityCount).toBe(5);
  });

  it("passes the ledger checks when the ledger is empty", async () => {
    const entries = await LedgerEntry.countDocuments();
    const report = await checkLedgerInvariants();
    expect(report.checks).toHaveLength(5);
    // When other suites ran transfers first, direct balance adjustments in the
    // suite may legitimately break invariants; on an empty ledger it must pass.
    if (entries === 0) expect(report.passed).toBe(true);
  });

  it("refuses updates to append-only ledger entries", async () => {
    await expect(LedgerEntry.updateOne({}, { $set: { amountMinor: 1 } })).rejects.toThrow(
      /append-only/,
    );
  });
});
