import { describe, expect, it } from "vitest";
import { assertAdminPathAllowed } from "@/server/auth/escalation";

const admin = { id: "a1", role: "admin" };
const staff = { id: "s1", role: "staff" };
const customer = { id: "c1", role: "customer" };

describe("Better Auth escalation guard", () => {
  it("lets admins use every admin route", () => {
    expect(() => assertAdminPathAllowed("/admin/create-user", { role: "admin" }, admin)).not.toThrow();
  });

  it("lets staff create customers only", () => {
    expect(() => assertAdminPathAllowed("/admin/create-user", {}, staff)).not.toThrow();
    expect(() => assertAdminPathAllowed("/admin/create-user", { role: "customer" }, staff)).not.toThrow();
    expect(() => assertAdminPathAllowed("/admin/create-user", { role: "admin" }, staff)).toThrow(
      /access/i,
    );
  });

  it("blocks staff from other admin routes and customers from all of them", () => {
    expect(() => assertAdminPathAllowed("/admin/list-users", {}, staff)).toThrow();
    expect(() => assertAdminPathAllowed("/admin/create-user", {}, customer)).toThrow();
    expect(() => assertAdminPathAllowed("/admin/create-user", {}, null)).toThrow();
  });

  it("rejects a role field on public sign-up", () => {
    expect(() => assertAdminPathAllowed("/sign-up/email", { role: "admin" }, null)).toThrow(
      /role/i,
    );
    expect(() => assertAdminPathAllowed("/sign-up/email", { email: "a@b.com" }, null)).not.toThrow();
  });
});
