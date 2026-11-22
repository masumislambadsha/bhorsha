import "server-only";

import { APIError } from "better-auth/api";

export interface GuardUser {
  id: string;
  role?: string;
}

/**
 * Blocks privilege escalation at the Better Auth hook boundary.
 * Kept DB-free so it can be unit-tested directly.
 */
export function assertAdminPathAllowed(
  path: string,
  body: Record<string, unknown>,
  user: GuardUser | null,
): void {
  if (path === "/sign-up/email" && "role" in body) {
    throw new APIError("FORBIDDEN", { message: "Role cannot be set during registration." });
  }

  if (!path.startsWith("/admin/")) return;

  const role = user?.role;
  if (role === "admin") return;

  const requested = body.role;
  if (
    role === "staff" &&
    path === "/admin/create-user" &&
    (requested === undefined || requested === "customer")
  ) {
    return;
  }

  throw new APIError("FORBIDDEN", { message: "You don't have access to that admin action." });
}
