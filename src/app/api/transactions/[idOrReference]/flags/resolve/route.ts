import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { resolveFlags } from "@/server/services/review";

export const POST = withHandler(
  {
    roles: ["admin"],
    params: z.object({ idOrReference: z.string().min(1) }),
    body: z.object({ action: z.enum(["clear", "reverse", "freeze_sender"]), note: z.string().max(300).optional() }),
  },
  async ({ actor, params, body }) => {
    await resolveFlags(actor, params.idOrReference, body);
    return Response.json({ ok: true });
  },
);
