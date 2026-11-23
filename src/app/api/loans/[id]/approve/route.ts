import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { approveLoan } from "@/server/services/loans";

export const POST = withHandler(
  { roles: ["admin"], params: z.object({ id: z.string().min(1) }) },
  async ({ actor, params }) => {
    await approveLoan(actor, params.id);
    return Response.json({ ok: true });
  },
);
