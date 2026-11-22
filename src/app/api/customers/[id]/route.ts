import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getCustomer } from "@/server/services/customers";

export const GET = withHandler({ roles: ["staff", "admin"], params: z.object({ id: z.string().min(1) }) }, async ({ actor, params }) => {
  return Response.json(await getCustomer(actor, params.id));
});
