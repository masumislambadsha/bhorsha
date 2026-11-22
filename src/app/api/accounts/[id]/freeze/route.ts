import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { freezeAccount } from "@/server/services/accounts";
import { freezeSchema } from "@/features/accounts/schemas";

export const POST = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }), body: freezeSchema },
  async ({ actor, params, body }) => {
    await freezeAccount(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
