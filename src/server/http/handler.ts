import "server-only";

import { randomUUID } from "node:crypto";
import type { AppRole } from "@/lib/domain";
import type { Actor } from "@/server/auth/guards";
import { getRequestSession } from "@/server/auth/session";
import { connectDB } from "@/server/db/mongoose";
import { isAppError } from "./errors";
import { assertAllowedOrigin } from "./origin";

interface Parser<T> {
  parse: (value: unknown) => T;
}

export interface HandlerOptions<P, Q, B> {
  roles?: readonly AppRole[];
  params?: Parser<P>;
  query?: Parser<Q>;
  body?: Parser<B>;
  rateLimit?: (actor: Actor | null) => Promise<void>;
}

export interface HandlerContext<P, Q, B> {
  req: Request;
  requestId: string;
  actor: Actor | null;
  user: { id: string; name: string; email: string; role: string } | null;
  params: P;
  query: Q;
  body: B;
}

function errorResponse(code: string, message: string, status: number, requestId: string, extras: Record<string, unknown> = {}) {
  return Response.json(
    { error: { code, message, ...extras, requestId } },
    { status },
  );
}

/** Single entry point for every API route: DB, CSRF, session, roles, validation, rate limit. */
export function withHandler<P = unknown, Q = unknown, B = unknown>(
  options: HandlerOptions<P, Q, B>,
  fn: (ctx: HandlerContext<P, Q, B>) => Promise<Response>,
) {
  return async function route(
    req: Request,
    routeContext: { params: Promise<Record<string, string>> },
  ): Promise<Response> {
    const requestId = randomUUID();
    try {
      await connectDB();

      if (req.method !== "GET" && req.method !== "HEAD") assertAllowedOrigin(req);

      const session = await getRequestSession(req.headers);
      const rawRole = (session?.user as { role?: string } | undefined)?.role;
      const role: AppRole | null =
        rawRole === "admin" || rawRole === "staff" || rawRole === "customer" ? rawRole : null;
      const actor: Actor | null = session?.user ? { id: session.user.id, role: role ?? "customer" } : null;

      if (options.roles) {
        if (!actor) {
          return errorResponse("UNAUTHENTICATED", "Sign in to continue.", 401, requestId);
        }
        if (!role || !options.roles.includes(role)) {
          return errorResponse("FORBIDDEN", "You don't have access to that.", 403, requestId);
        }
      }

      const rawParams = await routeContext.params;
      const params = options.params ? options.params.parse(rawParams) : (rawParams as P);

      const url = new URL(req.url);
      const rawQuery = Object.fromEntries(url.searchParams.entries());
      const query = options.query ? options.query.parse(rawQuery) : (rawQuery as Q);

      let rawBody: unknown = {};
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          rawBody = await req.json();
        } catch {
          return errorResponse("VALIDATION_ERROR", "Request body must be valid JSON.", 422, requestId);
        }
      }
      const body = options.body ? options.body.parse(rawBody) : (rawBody as B);

      if (options.rateLimit) await options.rateLimit(actor);

      const user = session?.user
        ? {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: role ?? "customer",
          }
        : null;

      return await fn({ req, requestId, actor, user, params, query, body });
    } catch (error) {
      if (isAppError(error)) {
        return errorResponse(error.code, error.message, error.status, requestId, {
          ...(error.details ? { details: error.details } : {}),
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        });
      }
      if (error && typeof error === "object" && "issues" in error) {
        const issues = (error as { issues: { path: (string | number)[]; message: string }[] }).issues;
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of issues) {
          const key = String(issue.path[0] ?? "form");
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return errorResponse("VALIDATION_ERROR", "Check the details you entered.", 422, requestId, { fieldErrors });
      }
      // Log metadata only — never request bodies, tokens, PINs or passwords.
      console.error(`[${requestId}] Unhandled route error:`, error instanceof Error ? error.message : "unknown");
      return errorResponse("INTERNAL_ERROR", "Something went wrong. Try again.", 500, requestId);
    }
  };
}
