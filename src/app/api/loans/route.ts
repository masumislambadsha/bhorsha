import { z } from "zod";
import { LOAN_STATUSES } from "@/lib/domain";
import { paginationSchema } from "@/server/http/pagination";
import { withHandler } from "@/server/http/handler";
import { applyForLoan, listLoans } from "@/server/services/loans";
import { createLoanSchema } from "@/features/loans/schemas";

const listQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(LOAN_STATUSES).optional(),
  ...paginationSchema.shape,
});

export const GET = withHandler({ query: listQuerySchema }, async ({ actor, query }) => {
  return Response.json(await listLoans(actor, query));
});

export const POST = withHandler({ roles: ["customer"], body: createLoanSchema }, async ({ actor, body }) => {
  const loan = await applyForLoan(actor, body);
  return Response.json(loan, { status: 201 });
});
