import { withHandler } from "@/server/http/handler";
import { AppError } from "@/server/http/errors";
import { updateProfile } from "@/server/services/customers";
import { meUpdateProfileSchema } from "@/features/auth/schemas";

export const PATCH = withHandler(
  { roles: ["customer"], body: meUpdateProfileSchema },
  async ({ actor, body }) => {
    if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
    await updateProfile(actor, body);
    return Response.json({ ok: true });
  },
);
