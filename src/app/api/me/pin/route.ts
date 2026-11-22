import { withHandler } from "@/server/http/handler";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { AppError } from "@/server/http/errors";
import { changePin, setPin } from "@/server/services/pin";
import { changePinSchema, pinSchema } from "@/features/auth/schemas";

const pinRate = (actor: { id: string } | null) => enforceRateLimit("pin", actor?.id ?? "anonymous");

export const POST = withHandler(
  { roles: ["customer"], body: pinSchema, rateLimit: pinRate },
  async ({ actor, body }) => {
    if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
    await setPin(actor, actor.id, body.pin);
    return Response.json({ ok: true });
  },
);

export const PUT = withHandler(
  { roles: ["customer"], body: changePinSchema, rateLimit: pinRate },
  async ({ actor, body }) => {
    if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
    await changePin(actor, actor.id, body.currentPin, body.newPin);
    return Response.json({ ok: true });
  },
);
