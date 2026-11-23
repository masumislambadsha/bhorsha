import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { paginationSchema } from "@/server/http/pagination";
import { listRequests, createRequest } from "@/server/services/requests";

const listQuerySchema = z.object({
  kind: z.enum(["deposit", "withdrawal"]).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  accountId: z.string().optional(),
  customerId: z.string().optional(),
  ...paginationSchema.shape,
});

const createSchema = z.object({
  kind: z.enum(["deposit", "withdrawal"]),
  accountId: z.string().min(1),
  amount: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

export const GET = withHandler({ query: listQuerySchema }, async ({ actor, query }) => {
  return Response.json(await listRequests(actor, query));
});

export const POST = withHandler({ roles: ["customer"], body: createSchema }, async ({ actor, body }) => {
  const request = await createRequest(actor, body);
  return Response.json(request, { status: 201 });
});
