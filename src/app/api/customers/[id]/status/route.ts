import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { setCustomerStatus } from "@/server/services/customers";
import { customerStatusSchema } from "@/features/customers/schemas";

export const PATCH = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }), body: customerStatusSchema },
  async ({ actor, params, body }) => {
    await setCustomerStatus(actor, params.id, body.status, body.reason);
    return Response.json({ ok: true });
  },
);
