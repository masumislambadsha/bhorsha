import { z } from "zod";
import { FLAG_STATUSES, TX_STATUSES, TX_TYPES } from "@/lib/domain";
import { paginationSchema } from "@/server/http/pagination";
import { withHandler } from "@/server/http/handler";
import { listCustomerTransactions, listTransactions } from "@/server/services/transactions";

const listQuerySchema = z.object({
  accountId: z.string().optional(),
  customerId: z.string().optional(),
  type: z.enum(TX_TYPES).optional(),
  status: z.enum(TX_STATUSES).optional(),
  flagStatus: z.enum(FLAG_STATUSES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().max(100).optional(),
  ...paginationSchema.shape,
});

export const GET = withHandler({ query: listQuerySchema }, async ({ actor, query }) => {
  if (actor?.role === "customer") return Response.json(await listCustomerTransactions(actor, query));
  return Response.json(await listTransactions(actor, query));
});
