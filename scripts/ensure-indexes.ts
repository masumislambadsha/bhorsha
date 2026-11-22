import "./load-env";
import mongoose from "mongoose";
import { getMongoClientInstance } from "../src/server/db/mongo-client";
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

async function closeConnections() {
  await mongoose.connection.close();
  await getMongoClientInstance().close();
}

main()
  .then(async () => {
    await closeConnections();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("Index creation failed:", error instanceof Error ? error.message : error);
    await closeConnections().catch(() => undefined);
    process.exit(1);
  });
