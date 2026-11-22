import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Isomorphic access-control config: imported by both the Better Auth server
 * and the client admin plugin. Never import server code here.
 */
export const ac = createAccessControl(defaultStatements);

export const roles = {
  admin: ac.newRole(adminAc.statements),
  staff: ac.newRole({ user: ["create", "get"] }),
  customer: ac.newRole({}),
};

export type AppRole = keyof typeof roles;
