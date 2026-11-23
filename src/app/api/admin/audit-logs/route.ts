import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { paginationSchema } from "@/server/http/pagination";
import { listAuditLogs } from "@/server/services/admin";

const querySchema = z.object({
  action: z.string().max(100).optional(),
  actorId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ...paginationSchema.shape,
});

export const GET = withHandler({ roles: ["admin"], query: querySchema }, async ({ actor, query }) => {
  return Response.json(await listAuditLogs(actor, query));
});
