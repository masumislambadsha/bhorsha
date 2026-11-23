import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { forwardLoan } from "@/server/services/loans";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ recommendation: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }),
  },
  async ({ actor, params, body }) => {
    await forwardLoan(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
