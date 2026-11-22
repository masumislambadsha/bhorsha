import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { updateLimits } from "@/server/services/accounts";
import { limitsUpdateSchema } from "@/features/accounts/schemas";

export const PATCH = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }), body: limitsUpdateSchema },
  async ({ actor, params, body }) => {
    await updateLimits(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
