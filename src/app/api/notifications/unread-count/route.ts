import { withHandler } from "@/server/http/handler";
import { unreadCount } from "@/server/services/notifications";

export const GET = withHandler({ roles: ["customer", "staff", "admin"] }, async ({ actor }) => {
  if (!actor) return Response.json(0);
  return Response.json(await unreadCount(actor.id));
});
