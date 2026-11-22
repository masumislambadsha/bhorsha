import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { reviewKYC } from "@/server/services/customers";
import { kycDecisionSchema } from "@/features/customers/schemas";

export const POST = withHandler(
  { roles: ["staff", "admin"], params: z.object({ id: z.string().min(1) }), body: kycDecisionSchema },
  async ({ actor, params, body }) => {
    await reviewKYC(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
