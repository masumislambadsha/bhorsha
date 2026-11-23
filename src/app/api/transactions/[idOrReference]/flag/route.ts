import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { flagTransaction } from "@/server/services/review";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ idOrReference: z.string().min(1) }),
    body: z.object({ reason: z.string().min(1).max(200) }),
  },
  async ({ actor, params, body }) => {
    await flagTransaction(actor, params.idOrReference, body.reason);
    return Response.json({ ok: true });
  },
);
