import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { repayLoan } from "@/server/services/loans";
import { repayLoanSchema } from "@/features/loans/schemas";
import { requireIdempotencyKey } from "@/server/http/idempotency";

export const POST = withHandler({ roles: ["customer"], params: z.object({ id: z.string().min(1) }), body: repayLoanSchema }, async ({ actor, params, body, req }) => {
  const idempotencyKey = requireIdempotencyKey(req);
  const loan = await repayLoan(actor, params.id, { ...body, idempotencyKey });
  return Response.json(loan);
});
