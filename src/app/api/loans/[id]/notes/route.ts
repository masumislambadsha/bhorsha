import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { addLoanNote } from "@/server/services/loans";

export const POST = withHandler(
  {
    roles: ["staff", "admin"],
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ body: z.string().min(1).max(500) }),
  },
  async ({ actor, params, body }) => {
    await addLoanNote(actor, params.id, body.body);
    return Response.json({ ok: true });
  },
);
