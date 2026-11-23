import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { createStaff, listStaff } from "@/server/services/admin";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(12).max(200),
});

export const GET = withHandler({ roles: ["admin"] }, async () => {
  return Response.json({ items: await listStaff(null) });
});

export const POST = withHandler({ roles: ["admin"], body: createSchema }, async ({ actor, body, req }) => {
  const staff = await createStaff(actor, body, req.headers);
  return Response.json(staff, { status: 201 });
});
