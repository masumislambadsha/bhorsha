import "./load-env";
import mongoose from "mongoose";
import { getMongoClientInstance } from "../src/server/db/mongo-client";
import { connectDB } from "../src/server/db/mongoose";
import { getServerEnv } from "../src/server/env";
import { checkLedgerInvariants } from "../src/server/services/integrity";

async function main(): Promise<number> {
  getServerEnv();
  await connectDB();
  const report = await checkLedgerInvariants();
  console.log(`Ledger verification — ${report.checkedAt}`);
  for (const check of report.checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"}  ${check.name}`);
    for (const failure of check.failures.slice(0, 20)) console.log(`      ${failure}`);
    if (check.failures.length > 20) console.log(`      …and ${check.failures.length - 20} more`);
  }
  console.log(report.passed ? "All ledger invariants hold." : "Ledger verification FAILED.");
  return report.passed ? 0 : 1;
}

async function closeConnections() {
  await mongoose.connection.close();
  await getMongoClientInstance().close();
}

main()
  .then(async (code) => {
    await closeConnections();
    process.exit(code);
  })
  .catch(async (error: unknown) => {
    console.error("Ledger verification could not run:", error instanceof Error ? error.message : error);
    await closeConnections().catch(() => undefined);
    process.exit(1);
  });
