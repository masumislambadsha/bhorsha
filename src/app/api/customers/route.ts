import { z } from "zod";
import { paginationSchema } from "@/server/http/pagination";
import { withHandler } from "@/server/http/handler";
import { createCustomerByStaff, generateTempPassword, listCustomers } from "@/server/services/customers";
import { customerRegisterSchema } from "@/features/customers/schemas";

const listCustomersQuerySchema = z.object({
  q: z.string().max(100).optional(),
  kyc: z.enum(["pending", "verified", "rejected"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  ...paginationSchema.shape,
});

export const GET = withHandler({ roles: ["staff", "admin"], query: listCustomersQuerySchema }, async ({ actor, query }) => {
  return Response.json(await listCustomers(actor, query));
});

export const POST = withHandler({ roles: ["staff", "admin"], body: customerRegisterSchema }, async ({ actor, body, req }) => {
  const tempPassword = generateTempPassword();
  const { userId } = await createCustomerByStaff(actor, body, tempPassword, req.headers);
  return Response.json({ userId, tempPassword }, { status: 201 });
});
