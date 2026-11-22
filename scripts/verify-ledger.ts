import { connectDB } from "../src/server/db/mongoose";
import { getServerEnv } from "../src/server/env";
import { checkLedgerInvariants } from "../src/server/services/integrity";

async function main() {
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
  if (!report.passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("Ledger verification could not run:", error);
  process.exit(1);
});
