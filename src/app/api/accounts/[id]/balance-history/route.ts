import { z } from "zod";
import { paginationSchema } from "@/server/http/pagination";
import { withHandler } from "@/server/http/handler";
import { getBalanceHistory } from "@/server/services/accounts";

export const GET = withHandler(
  { params: z.object({ id: z.string().min(1) }), query: z.object({ ...paginationSchema.shape, days: z.coerce.number().int().min(1).max(366).optional() }) },
  async ({ actor, params, query }) => {
    const days = query.days ?? 90;
    return Response.json(await getBalanceHistory(actor, params.id, days));
  },
);
