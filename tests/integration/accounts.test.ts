import { beforeAll, describe, expect, it } from "vitest";
import { BankAccount, CustomerProfile } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { ensureSettings } from "@/server/services/settings";
import { ensureSystemAccounts } from "@/server/services/system-accounts";
import { freezeAccount, getAccount, getBalanceHistory, listAccounts, openAccount, unfreezeAccount, updateLimits } from "@/server/services/accounts";

const actor = { id: "staff-1", role: "admin" as const };

describe("account services", () => {
  beforeAll(async () => {
    await connectDB();
    await ensureSettings();
    await ensureSystemAccounts();
    await CustomerProfile.insertMany([
      { userId: "cust-a", kycStatus: "verified", status: "active" },
      { userId: "cust-b", kycStatus: "pending", status: "active" },
    ]);
  });

  it("opens accounts with generated numbers and zero balance", async () => {
    const accountId = await openAccount(actor, { customerId: "cust-a", type: "savings", nickname: "Main savings" });
    const doc = await BankAccount.findById(accountId).lean();
    expect(doc).toBeTruthy();
    expect(doc?.ownerId).toBe("cust-a");
    expect(doc?.type).toBe("savings");
    expect(doc?.balanceMinor).toBe(0);
    expect(doc?.status).toBe("active");

    const dto = await getAccount(actor, accountId);
    expect(dto.nickname).toBe("Main savings");
    expect(dto.availableMinor).toBe(0);

    const listed = await listAccounts(actor, { page: 1, pageSize: 10 });
    expect(listed.total).toBeGreaterThan(0);
  });

  it("requires a verified and active customer", async () => {
    await expect(openAccount(actor, { customerId: "cust-b", type: "savings" })).rejects.toMatchObject({ code: "KYC_REQUIRED" });
    await CustomerProfile.updateOne({ userId: "cust-b" }, { $set: { kycStatus: "verified" } });
    await CustomerProfile.updateOne({ userId: "cust-b" }, { $set: { status: "inactive" } });
    await expect(openAccount(actor, { customerId: "cust-b", type: "savings" })).rejects.toMatchObject({ code: "CUSTOMER_INACTIVE" });
  });

  it("updates limits, freezes/unfreezes, and reads balance history", async () => {
    const accountId = await openAccount(actor, { customerId: "cust-a", type: "current" });
    await updateLimits(actor, accountId, { perTransactionMinor: 500_000 });
    expect((await getAccount(actor, accountId)).limits.perTransactionMinor).toBe(500_000);

    await freezeAccount(actor, accountId, { reason: "hold" });
    expect((await getAccount(actor, accountId)).status).toBe("frozen");
    await unfreezeAccount(actor, accountId);
    expect((await getAccount(actor, accountId)).status).toBe("active");

    const history = await getBalanceHistory(actor, accountId);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((p) => p.balance === 0)).toBe(true);
  });
});
