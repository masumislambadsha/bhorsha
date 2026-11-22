import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { unfreezeAccount } from "@/server/services/accounts";

export const POST = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }) },
  async ({ actor, params }) => {
    await unfreezeAccount(actor, params.id);
    return Response.json({ ok: true });
  },
);
