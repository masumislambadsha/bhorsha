import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { BankAccount, BankSettings, CustomerProfile, TransactionModel, DepositWithdrawalRequest, Loan } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { openAccount } from "@/server/services/accounts";
import { writeLedgerEntries } from "@/server/services/ledger";
import { checkLedgerInvariants } from "@/server/services/integrity";
import { ensureSettings } from "@/server/services/settings";
import { ensureSystemAccounts, systemAccountId } from "@/server/services/system-accounts";
import { setPin } from "@/server/services/pin";
import { reviewTransfer } from "@/server/services/review";
import { transfer, reverseTransfer } from "@/server/services/transfer";
import { runInTransaction } from "@/server/db/transaction";
import type { ClientSession } from "mongoose";

const adminActor = { id: "fz-admin", role: "admin" as const };
const customer = (id: string) => ({ id, role: "customer" as const });

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed the ledger consistently: one balanced transfer crediting every customer
 * account 500_000 paisa, so the invariant checker has non-zero balances. */
async function seedBalances(accounts: string[]): Promise<void> {
  const amount = 500_000; // ৳5,000 per account
  const set = async (session: ClientSession, accountId: string, balance: number) => {
    await BankAccount.updateOne({ _id: accountId }, { $set: { balanceMinor: balance } }, { session });
  };
  await runInTransaction(async (session) => {
    const [txn] = await TransactionModel.create(
      [{ type: "transfer", status: "completed", amountMinor: 0, feeMinor: 0, reference: `SEED-${randomUUID()}`, flags: [], flagStatus: "none" }],
      { session },
    );
    const id = String(txn._id);
    const cashId = await systemAccountId("CASH_CLEARING", session);
    await set(session, cashId, -amount * accounts.length);
    const credits = [];
    for (const accountId of accounts) {
      const doc = await BankAccount.findById(accountId).lean();
      if (!doc) continue;
      await set(session, accountId, doc.balanceMinor + amount);
      credits.push({ transactionId: id, accountId, direction: "credit" as const, amountMinor: amount, balanceAfterMinor: doc.balanceMinor + amount, entryType: "principal" as const });
    }
    await writeLedgerEntries(
      [{ transactionId: id, accountId: cashId, direction: "debit" as const, amountMinor: amount * accounts.length, balanceAfterMinor: -amount * accounts.length, entryType: "principal" as const }, ...credits],
      session,
    );
  });
}

describe("ledger fuzz (§13.11)", () => {
  it("the ledger invariant checker passes after a random sequence of 200 mixed operations", async () => {
    await connectDB();
    // Isolate this test from other files sharing the in-memory DB. Append-only
    // collections are cleared through the native driver.
    const { getMongoClient } = await import("@/server/db/mongo-client");
    const db = (await getMongoClient()).db();
    for (const name of ["bankaccounts", "customerprofiles", "transactions", "depositwithdrawalrequests", "loans", "ledgerentries", "notifications"]) {
      await db.collection(name).deleteMany({});
    }
    await BankAccount.deleteMany({});
    await CustomerProfile.deleteMany({});
    await TransactionModel.deleteMany({});
    await DepositWithdrawalRequest.deleteMany({});
    await Loan.deleteMany({});
    await ensureSettings();
    await ensureSystemAccounts();
    await BankSettings.updateOne({ key: "default" }, { $set: { "risk.velocityCount": 1000, "risk.oddHoursMinMinor": 0 } });

    const users = ["fz-a", "fz-b", "fz-c", "fz-d"];
    for (const userId of users) {
      await CustomerProfile.updateOne({ userId }, { $set: { kycStatus: "verified", status: "active" } }, { upsert: true });
      await setPin(customer(userId), userId, "1234");
    }
    const accounts = [];
    for (const userId of users) {
      accounts.push(await openAccount(adminActor, { customerId: userId, type: "savings" }));
    }
    await seedBalances(accounts);

    const rnd = mulberry32(0x5eed);
    let transfers = 0;

    for (let i = 0; i < 200; i++) {
      const op = rnd();
      const idx = Math.floor(rnd() * accounts.length);
      const sender = accounts[idx];
      const recipient = accounts[(idx + 1 + Math.floor(rnd() * 3)) % accounts.length];
      const number = (await BankAccount.findById(recipient).lean())?.accountNumber;
      if (!number) continue;
      const amount = `${(Math.floor(rnd() * 1_000) + 100).toFixed(2)}`;

      if (op < 0.55) {
        transfers++;
        const result = await transfer(customer(users[idx]), { fromAccountId: sender, toAccountNumber: number, amount, pin: "1234", idempotencyKey: randomUUID(), confirmDuplicate: true }).catch((e) => ({ error: e }));
        if (!("transaction" in result) && rnd() < 0) console.log("transfer error:", result);
      } else if (op < 0.75) {
        // Review a pending held transfer (approve or reject).
        const pending = await TransactionModel.findOne({ status: "pending" }).lean();
        if (pending) {
          const decision = rnd() < 0.5 ? "approve" : "reject";
          await reviewTransfer(adminActor, String(pending._id), { decision, note: "fuzz" }).catch(() => undefined);
        }
      } else {
        // Reverse a completed transfer (best effort; may need funds on the receiver).
        const completed = await TransactionModel.findOne({ status: "completed", type: "transfer" }).lean();
        if (completed) await reverseTransfer(adminActor, String(completed._id), "fuzz reversal").catch(() => undefined);
      }
    }
    expect(transfers).toBeGreaterThan(0);

    const report = await checkLedgerInvariants();
    if (report.passed === false) console.log("FAILURES:", JSON.stringify(report.checks.filter((c) => c.failures.length > 0), null, 2));
    expect(report.passed).toBe(true);
  }, 120_000);
});
