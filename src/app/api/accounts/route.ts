import { z } from "zod";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from "@/lib/domain";
import { paginationSchema } from "@/server/http/pagination";
import { withHandler } from "@/server/http/handler";
import { listAccounts, openAccount } from "@/server/services/accounts";
import { openAccountSchema } from "@/features/accounts/schemas";

const listAccountsQuerySchema = z.object({
  customerId: z.string().optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  q: z.string().max(100).optional(),
  ...paginationSchema.shape,
});

export const GET = withHandler({ query: listAccountsQuerySchema }, async ({ actor, query }) => {
  return Response.json(await listAccounts(actor, query));
});

export const POST = withHandler({ roles: ["staff", "admin"], body: openAccountSchema }, async ({ actor, body }) => {
  const accountId = await openAccount(actor, body);
  return Response.json({ accountId }, { status: 201 });
});
