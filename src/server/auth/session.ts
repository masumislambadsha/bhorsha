import "server-only";

import { headers as nextHeaders } from "next/headers";
import type { AppRole } from "@/lib/domain";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Used by route handlers through withHandler (mockable in tests). */
export async function getRequestSession(requestHeaders: Headers) {
  return auth.api.getSession({ headers: requestHeaders });
}

/** Used by server components and layouts. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await nextHeaders() });
}

export function roleOf(session: Awaited<ReturnType<typeof getServerSession>>): AppRole | null {
  const role = session?.user?.role;
  return role === "admin" || role === "staff" || role === "customer" ? role : null;
}

export function homeForRole(role: AppRole | null): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/customer";
}
