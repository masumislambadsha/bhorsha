import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { rejectRequest } from "@/server/services/requests";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ reason: z.string().min(5).max(300) }),
  },
  async ({ actor, params, body }) => {
    await rejectRequest(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
