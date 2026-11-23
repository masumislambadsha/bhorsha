import { withHandler } from "@/server/http/handler";
import { checkLedgerInvariants } from "@/server/services/integrity";
import { writeAuditLog } from "@/server/services/audit";
import { AppError } from "@/server/http/errors";

export const POST = withHandler({ roles: ["admin"] }, async ({ actor }) => {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  const report = await checkLedgerInvariants();
  await writeAuditLog(actor, {
    action: "INTEGRITY_CHECK_RUN",
    entityType: "ledger",
    entityId: "default",
    summary: `Integrity check ${report.passed ? "passed" : "failed"}.`,
  });
  return Response.json(report);
});
