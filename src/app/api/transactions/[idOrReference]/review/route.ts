import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { reviewTransfer } from "@/server/services/review";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ idOrReference: z.string().min(1) }),
    body: z.object({ decision: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }),
  },
  async ({ actor, params, body }) => {
    await reviewTransfer(actor, params.idOrReference, body);
    return Response.json({ ok: true });
  },
);
