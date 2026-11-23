import { withHandler } from "@/server/http/handler";
import { getStaffStats } from "@/server/services/stats";

export const GET = withHandler({ roles: ["staff", "admin"] }, async () => {
  return Response.json(await getStaffStats());
});
