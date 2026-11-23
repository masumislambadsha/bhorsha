import "./load-env";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { auth } from "../src/server/auth/auth";
import type { Actor } from "../src/server/auth/guards";
import { openAccount } from "../src/server/services/accounts";
import {
  BankAccount,
  BankSettings,
  CustomerProfile,
  DepositWithdrawalRequest,
  Loan,
  Notification,
  RateLimit,
  TransactionModel,
} from "../src/server/db/models";
import { getMongoClient } from "../src/server/db/mongo-client";
import { connectDB } from "../src/server/db/mongoose";
import { getServerEnv } from "../src/server/env";
import { checkLedgerInvariants } from "../src/server/services/integrity";
import { ensureSettings } from "../src/server/services/settings";
import { ensureSystemAccounts } from "../src/server/services/system-accounts";
import {
  addLoanNote,
  applyForLoan,
  approveLoan,
  disburseLoan,
  forwardLoan,
  rejectLoan,
  repayLoan,
} from "../src/server/services/loans";
import { approveRequest, createRequest } from "../src/server/services/requests";
import { setPin } from "../src/server/services/pin";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "customer";
  phone: string;
  kycStatus?: "pending" | "verified" | "rejected";
  customerStatus?: "active" | "inactive";
  address?: string;
}

const USERS: SeedUser[] = [
  { name: "Farhana Kabir", email: "admin@bhorsa.demo", password: "Admin@1234", role: "admin", phone: "01710000001" },
  { name: "Tanvir Ahmed", email: "staff@bhorsa.demo", password: "Staff@1234", role: "staff", phone: "01710000002" },
  { name: "Sadia Islam", email: "sadia@bhorsa.demo", password: "Staff@1234", role: "staff", phone: "01710000003" },
  { name: "Rahim Uddin", email: "customer@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000001", kycStatus: "verified", address: "Dhanmondi, Dhaka" },
  { name: "Nusrat Jahan", email: "nusrat@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000002", kycStatus: "verified", address: "Uttara, Dhaka" },
  { name: "Arif Hossain", email: "arif@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000003", kycStatus: "verified", address: "Chittagong" },
  { name: "Mitu Akter", email: "mitu@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000004", kycStatus: "verified", address: "Sylhet" },
  { name: "Karim Chowdhury", email: "karim@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000005", kycStatus: "verified", customerStatus: "inactive", address: "Khulna" },
  { name: "Jannat Ara", email: "jannat@bhorsa.demo", password: "Customer@1234", role: "customer", phone: "01715000006", kycStatus: "pending", address: "Rajshahi" },
];

/** §14: consistent demo history written through the real services. */
async function seedDemoData(
  admin: Actor,
  userIds: Map<string, string>,
  accounts: Record<string, { accountId: string; type: string }[]>,
): Promise<void> {
  const customer = (email: string): Actor => ({ id: userIds.get(email)!, role: "customer" });
  const staff: Actor = { id: userIds.get("staff@bhorsa.demo")!, role: "staff" };
  const rahim = customer("customer@bhorsa.demo");
  const nusrat = customer("nusrat@bhorsa.demo");
  const arif = customer("arif@bhorsa.demo");
  const karim = customer("karim@bhorsa.demo");
  const rahimSavings = accounts["customer@bhorsa.demo"][0].accountId;
  const nusratSavings = accounts["nusrat@bhorsa.demo"][0].accountId;
  const arifSavings = accounts["arif@bhorsa.demo"][0].accountId;

  await setPin(rahim, rahim.id, "1234");
  await setPin(nusrat, nusrat.id, "1234");
  await setPin(arif, arif.id, "1234");

  // Fund Rahim's savings so repayments and the pending withdrawal hold have balance.
  const salary = await createRequest(rahim, {
    kind: "deposit",
    accountId: rahimSavings,
    amount: "500000.00",
    description: "Monthly salary credit",
  });
  await approveRequest(admin, salary.id, { note: "Salary slip verified." });

  const apply = (actor: Actor, accountId: string, loanType: string, amount: string, durationMonths: number) =>
    applyForLoan(actor, {
      loanType,
      amount,
      durationMonths,
      monthlyIncome: "150000.00",
      employmentStatus: "salaried",
      description: `Demo ${loanType} loan application used to illustrate the ${loanType} lending workflow end to end.`,
      disbursementAccountId: accountId,
    });

  // Rahim: active personal loan with three installments paid.
  const rahimLoan = await apply(rahim, rahimSavings, "personal", "200000.00", 12);
  await approveLoan(admin, rahimLoan.id);
  await disburseLoan(admin, rahimLoan.id);
  for (let i = 0; i < 3; i += 1) {
    await repayLoan(rahim, rahimLoan.id, {
      fromAccountId: rahimSavings,
      pin: "1234",
      mode: "next_installment",
      idempotencyKey: randomUUID(),
    });
  }

  // Nusrat: pending education loan and a completed personal loan.
  await apply(nusrat, nusratSavings, "education", "300000.00", 24);
  const completed = await apply(nusrat, nusratSavings, "personal", "120000.00", 12);
  await approveLoan(admin, completed.id);
  await disburseLoan(admin, completed.id);
  await repayLoan(nusrat, completed.id, {
    fromAccountId: nusratSavings,
    pin: "1234",
    mode: "payoff",
    idempotencyKey: randomUUID(),
  });

  // Arif: business loan under review with a note and recommendation; home loan approved.
  const business = await apply(arif, arifSavings, "business", "500000.00", 24);
  await addLoanNote(staff, business.id, "Business registration and last two years of returns look consistent.");
  await forwardLoan(staff, business.id, { recommendation: "approve", note: "Recommended for approval." });
  const home = await apply(arif, arifSavings, "home", "2000000.00", 120);
  await approveLoan(admin, home.id);

  // Karim: rejected car loan (he is inactive, so apply while temporarily active).
  await CustomerProfile.updateOne({ userId: karim.id }, { $set: { status: "active" } });
  const car = await apply(karim, accounts["karim@bhorsa.demo"][0].accountId, "car", "400000.00", 36);
  await rejectLoan(admin, car.id, { reason: "Income does not support the requested term." });
  await CustomerProfile.updateOne({ userId: karim.id }, { $set: { status: "inactive" } });

  // Pending request queues: two deposits and one withdrawal holding funds.
  await createRequest(nusrat, { kind: "deposit", accountId: nusratSavings, amount: "25000.00", description: "Pending cash deposit" });
  await createRequest(arif, { kind: "deposit", accountId: arifSavings, amount: "40000.00", description: "Pending cash deposit" });
  await createRequest(rahim, { kind: "withdrawal", accountId: rahimSavings, amount: "15000.00", description: "Pending cash withdrawal" });
}

async function main() {
  getServerEnv();
  if (process.env.SEED_ALLOW_RESET !== "true") {
    throw new Error("Refusing to seed: set SEED_ALLOW_RESET=true to clear and reseed this database.");
  }

  const mongo = await getMongoClient();
  const db = mongo.db();
  await connectDB();

  await BankAccount.deleteMany({});
  await CustomerProfile.deleteMany({});
  await TransactionModel.deleteMany({});
  await DepositWithdrawalRequest.deleteMany({});
  await Loan.deleteMany({});
  await Notification.deleteMany({});
  await BankSettings.deleteMany({});
  await RateLimit.deleteMany({});
  // Append-only collections cannot be cleared through Mongoose hooks; the
  // trusted reset uses the native driver instead.
  for (const name of [
    "user",
    "session",
    "account",
    "verification",
    "rateLimit",
    "counters",
    "ledgerentries",
    "auditlogs",
  ]) {
    await db.collection(name).deleteMany({});
  }

  await ensureSettings();
  await ensureSystemAccounts();

  const userIds = new Map<string, string>();
  for (const seed of USERS) {
    const result = await auth.api.signUpEmail({
      body: {
        name: seed.name,
        email: seed.email,
        password: seed.password,
        phone: seed.phone,
      },
      headers: new Headers(),
    });
    const userId = result.user.id;
    userIds.set(seed.email, userId);
    const filter = { _id: new ObjectId(userId) };
    await db.collection("user").updateOne(filter, {
      $set: { role: seed.role, banned: false },
    });

    if (seed.role === "customer") {
      await CustomerProfile.updateOne(
        { userId },
        {
          $set: {
            phone: seed.phone,
            address: seed.address ?? null,
            kycStatus: seed.kycStatus ?? "pending",
            status: seed.customerStatus ?? "active",
            registeredBy: null,
          },
        },
      );
    }
    console.log(`Seeded ${seed.role}: ${seed.email}`);
  }

  // Accounts: Rahim (savings + current), Nusrat (savings), Arif (savings + business),
  // Mitu (savings, frozen), Karim (savings, inactive customer), Jannat (none).
  const seedActor = { id: "seed", role: "admin" as const };
  const OPEN_ACCOUNTS: Record<string, ("savings" | "current" | "business")[]> = {
    "customer@bhorsa.demo": ["savings", "current"],
    "nusrat@bhorsa.demo": ["savings"],
    "arif@bhorsa.demo": ["savings", "business"],
    "mitu@bhorsa.demo": ["savings"],
    "karim@bhorsa.demo": ["savings"],
  };
  const seededAccounts: Record<string, { accountId: string; type: string }[]> = {};
  for (const [email, types] of Object.entries(OPEN_ACCOUNTS)) {
    const customerId = userIds.get(email);
    if (!customerId) continue;
    const configured = USERS.find((user) => user.email === email);
    const inactive = configured?.customerStatus === "inactive";
    // openAccount enforces an active profile; activate temporarily, then restore.
    if (inactive) await CustomerProfile.updateOne({ userId: customerId }, { $set: { status: "active" } });
    const opened: { accountId: string; type: string }[] = [];
    for (const type of types) {
      opened.push({ accountId: await openAccount(seedActor, { customerId, type }), type });
    }
    if (inactive) await CustomerProfile.updateOne({ userId: customerId }, { $set: { status: "inactive" } });
    seededAccounts[email] = opened;
  }
  for (const account of seededAccounts["mitu@bhorsa.demo"] ?? []) {
    await BankAccount.updateOne({ _id: account.accountId }, { $set: { status: "frozen", statusReason: "Frozen in demo data.", statusChangedBy: "seed", statusChangedAt: new Date() } });
  }

  // §14 seed data: loans in every status, the request queues, and light activity.
  await seedDemoData(seedActor, userIds, seededAccounts);

  const report = await checkLedgerInvariants();
  if (!report.passed) {
    throw new Error(`Seed integrity check failed: ${JSON.stringify(report.checks.filter((c) => !c.passed))}`);
  }
  console.log("Seed complete; ledger invariants hold.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
