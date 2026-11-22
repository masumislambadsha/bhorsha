import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { blockCustomer } from "@/server/services/customers";
import { blockCustomerSchema } from "@/features/customers/schemas";

export const POST = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }), body: blockCustomerSchema },
  async ({ actor, params, body, req }) => {
    await blockCustomer(actor, params.id, body, req.headers);
    return Response.json({ ok: true });
  },
);
