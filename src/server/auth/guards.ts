import "server-only";

import type { AppRole } from "@/lib/domain";
import { AppError } from "@/server/http/errors";

export interface Actor {
  id: string;
  role: AppRole;
}

export function assertRole(actor: Actor | null, allowed: readonly AppRole[]): asserts actor is Actor {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  if (!allowed.includes(actor.role)) {
    throw new AppError("FORBIDDEN", "You don't have access to that.");
  }
}

/** Customers only ever see their own resources; a mismatch is indistinguishable from missing. */
export function assertOwnsAccount(actor: Actor, ownerId: string | null | undefined): void {
  if (actor.role === "customer" && ownerId !== actor.id) {
    throw new AppError("NOT_FOUND", "That account was not found.");
  }
}

export function assertNotSelf(actorId: string, initiatorId: string | undefined): void {
  if (initiatorId && actorId === initiatorId) {
    throw new AppError(
      "SELF_APPROVAL_NOT_ALLOWED",
      "You can't act on something you started. Ask another staff member or an admin.",
    );
  }
}

export function assertWithinApprovalLimit(
  actor: Actor,
  amountMinor: number,
  staffLimitMinor: number,
): void {
  if (actor.role === "staff" && amountMinor > staffLimitMinor) {
    throw new AppError(
      "APPROVAL_LIMIT_EXCEEDED",
      "This amount needs admin approval.",
    );
  }
}
