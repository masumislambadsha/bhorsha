import "server-only";

import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { betterAuth } from "better-auth";
import { APP_NAME } from "@/config/app";
import { ac, roles } from "@/lib/permissions";
import { getMongoClientInstance } from "@/server/db/mongo-client";
import { CustomerProfile } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { assertAdminPathAllowed } from "./escalation";

// Constructing the client is synchronous; the driver connects lazily. This
// keeps the module importable from tsx/CJS scripts without top-level await.
const mongoClient = getMongoClientInstance();

export const auth = betterAuth({
  appName: APP_NAME,
  database: mongodbAdapter(mongoClient.db(), { client: mongoClient }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
  rateLimit: { enabled: true, storage: "database" },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
    },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "customer", adminRoles: ["admin"] }),
    // nextCookies must stay last so Set-Cookie headers survive.
    nextCookies(),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      const user = session?.user
        ? { id: session.user.id, role: (session.user as { role?: string }).role }
        : null;
      assertAdminPathAllowed(
        ctx.path,
        (ctx.body ?? {}) as Record<string, unknown>,
        user,
      );
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if ((user as { role?: string }).role !== "customer") return;
          await connectDB();
          await CustomerProfile.create([
            {
              userId: user.id,
              phone: (user as { phone?: string }).phone,
              kycStatus: "pending",
              status: "active",
              registeredBy: null,
            },
          ]);
        },
      },
    },
  },
});
