import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getLoan } from "@/server/services/loans";

export const GET = withHandler(
  { params: z.object({ id: z.string().min(1) }) },
  async ({ actor, params }) => Response.json(await getLoan(actor, params.id)),
);
