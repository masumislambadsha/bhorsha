import { withHandler } from "@/server/http/handler";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { lookupAccount } from "@/server/services/accounts";
import { accountLookupSchema } from "@/features/accounts/schemas";

export const GET = withHandler(
  {
    roles: ["customer"],
    query: accountLookupSchema,
    rateLimit: (actor) => enforceRateLimit("lookup", actor?.id ?? "anonymous"),
  },
  async ({ actor, query }) => {
    const number = query.number.replace(/\s+/g, "");
    const result = await lookupAccount(actor, number);
    return Response.json(result);
  },
);
