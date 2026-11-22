import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { unblockCustomer } from "@/server/services/customers";

export const POST = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }) },
  async ({ actor, params, req }) => {
    await unblockCustomer(actor, params.id, req.headers);
    return Response.json({ ok: true });
  },
);
