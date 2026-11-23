import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getCustomerStats } from "@/server/services/stats";

const querySchema = z.object({
  accountId: z.string().optional(),
  months: z.coerce.number().int().min(6).max(12).default(12),
});

export const GET = withHandler({ roles: ["customer"], query: querySchema }, async ({ actor, query }) => {
  return Response.json(await getCustomerStats(actor, query.accountId, query.months));
});
