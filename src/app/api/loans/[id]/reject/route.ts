import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { rejectLoan } from "@/server/services/loans";

export const POST = withHandler(
  {
    roles: ["admin"],
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ reason: z.string().min(5).max(300) }),
  },
  async ({ actor, params, body }) => {
    await rejectLoan(actor, params.id, body);
    return Response.json({ ok: true });
  },
);
