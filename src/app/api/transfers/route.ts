import { withHandler } from "@/server/http/handler";
import { requireIdempotencyKey } from "@/server/http/idempotency";
import { transfer } from "@/server/services/transfer";
import { transferSchema } from "@/features/transactions/schemas";

export const POST = withHandler({ roles: ["customer"], body: transferSchema }, async ({ actor, body, req }) => {
  const idempotencyKey = requireIdempotencyKey(req);
  const { transaction, idempotentReplay } = await transfer(actor, { ...body, idempotencyKey });
  const headers = idempotentReplay ? { "Idempotent-Replay": "true" } : undefined;
  return Response.json(transaction, { status: idempotentReplay ? 200 : 201, headers });
});
