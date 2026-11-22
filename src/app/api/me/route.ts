import { CustomerProfile } from "@/server/db/models";
import { toMeDto } from "@/server/dto/me";
import { AppError } from "@/server/http/errors";
import { withHandler } from "@/server/http/handler";

export const GET = withHandler({}, async ({ actor, user }) => {
  if (!actor || !user) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  const profile = actor.role === "customer"
    ? await CustomerProfile.findOne({ userId: actor.id }).select("-pin").lean()
    : null;

  return Response.json(toMeDto(user, profile as Parameters<typeof toMeDto>[1]));
});
