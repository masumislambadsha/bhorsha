import "server-only";

import { getServerEnv, trustedOrigins } from "@/server/env";
import { AppError } from "./errors";

/** CSRF protection for cookie-authenticated mutations. */
export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const allowed = [getServerEnv().NEXT_PUBLIC_APP_URL, ...trustedOrigins()].map((value) =>
    value.replace(/\/$/, ""),
  );
  if (!origin || !allowed.includes(origin.replace(/\/$/, ""))) {
    throw new AppError("FORBIDDEN", "That request came from an untrusted origin.");
  }
}
