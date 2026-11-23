import { withHandler } from "@/server/http/handler";
import { getLoanProducts } from "@/server/services/loans";

export const GET = withHandler({}, async () => Response.json(await getLoanProducts()));
