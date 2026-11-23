import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getAdminStats } from "@/server/services/stats";

const querySchema = z.object({
  months: z.coerce.number().int().min(6).max(12).default(12),
});

export const GET = withHandler({ roles: ["admin"], query: querySchema }, async ({ query }) => {
  return Response.json(await getAdminStats(query.months));
});
