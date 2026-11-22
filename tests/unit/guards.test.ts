import { describe, expect, it } from "vitest";
import {
  assertNotSelf,
  assertOwnsAccount,
  assertRole,
  assertWithinApprovalLimit,
  type Actor,
} from "@/server/auth/guards";
import { AppError } from "@/server/http/errors";

const customer: Actor = { id: "u1", role: "customer" };
const staff: Actor = { id: "s1", role: "staff" };
const admin: Actor = { id: "a1", role: "admin" };

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof AppError ? error.code : "UNKNOWN";
  }
}

describe("authorization guards", () => {
  it("requires a session and an allowed role", () => {
    expect(codeOf(() => assertRole(null, ["customer"]))).toBe("UNAUTHENTICATED");
    expect(codeOf(() => assertRole(customer, ["admin"]))).toBe("FORBIDDEN");
    expect(codeOf(() => assertRole(customer, ["customer"]))).toBeUndefined();
  });

  it("hides other customers' accounts as 404", () => {
    expect(codeOf(() => assertOwnsAccount(customer, "u2"))).toBe("NOT_FOUND");
    expect(codeOf(() => assertOwnsAccount(customer, "u1"))).toBeUndefined();
    expect(codeOf(() => assertOwnsAccount(staff, "u2"))).toBeUndefined();
  });

  it("blocks self approval", () => {
    expect(codeOf(() => assertNotSelf(staff.id, "s1"))).toBe("SELF_APPROVAL_NOT_ALLOWED");
    expect(codeOf(() => assertNotSelf(staff.id, "u1"))).toBeUndefined();
  });

  it("enforces the staff approval limit but not the admin's", () => {
    expect(codeOf(() => assertWithinApprovalLimit(staff, 100, 50))).toBe("APPROVAL_LIMIT_EXCEEDED");
    expect(codeOf(() => assertWithinApprovalLimit(staff, 50, 50))).toBeUndefined();
    expect(codeOf(() => assertWithinApprovalLimit(admin, 100, 50))).toBeUndefined();
  });
});
