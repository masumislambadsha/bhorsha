import { connectDB } from "../src/server/db/mongoose";
import {
  AuditLog,
  BankAccount,
  BankSettings,
  Counter,
  CustomerProfile,
  DepositWithdrawalRequest,
  LedgerEntry,
  Loan,
  Notification,
  RateLimit,
  TransactionModel,
} from "../src/server/db/models";
import { getServerEnv } from "../src/server/env";

async function main() {
  getServerEnv();
  await connectDB();
  const models = [
    AuditLog,
    BankAccount,
    BankSettings,
    Counter,
    CustomerProfile,
    DepositWithdrawalRequest,
    LedgerEntry,
    Loan,
    Notification,
    RateLimit,
    TransactionModel,
  ];
  for (const model of models) {
    await model.createIndexes();
    console.log(`Indexes ready: ${model.modelName}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Index creation failed:", error);
    process.exit(1);
  });
