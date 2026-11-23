import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { approveRequest } from "@/server/services/requests";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ note: z.string().max(300).optional() }),
  },
  async ({ actor, params, body }) => {
    await approveRequest(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
