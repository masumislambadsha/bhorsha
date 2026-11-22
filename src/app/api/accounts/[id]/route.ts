import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getAccount } from "@/server/services/accounts";

export const GET = withHandler({ params: z.object({ id: z.string().min(1) }) }, async ({ actor, params }) => {
  return Response.json(await getAccount(actor, params.id));
});
