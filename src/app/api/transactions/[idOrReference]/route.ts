import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getTransaction } from "@/server/services/transactions";

export const GET = withHandler(
  { params: z.object({ idOrReference: z.string().min(1) }) },
  async ({ actor, params }) => Response.json(await getTransaction(actor, params.idOrReference)),
);
