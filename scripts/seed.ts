import "./load-env";
import { ObjectId } from "mongodb";
import { auth } from "../src/server/auth/auth";
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
