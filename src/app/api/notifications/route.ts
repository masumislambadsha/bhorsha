import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { listNotifications, markRead } from "@/server/services/notifications";

const querySchema = z.object({ filter: z.enum(["unread", "read"]).optional() });
const bodySchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export const GET = withHandler({ roles: ["customer", "staff", "admin"], query: querySchema }, async ({ actor, query }) => {
  if (!actor) return Response.json([]);
  return Response.json(await listNotifications(actor.id, query.filter));
});

export const POST = withHandler({ roles: ["customer", "staff", "admin"], body: bodySchema }, async ({ actor, body }) => {
  if (!actor) return Response.json({ ok: false });
  await markRead(actor.id, body);
  return Response.json({ ok: true });
});
