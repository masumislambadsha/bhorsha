import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// The local seed only needs a throwaway secret; real deployments set their own.
process.env.BETTER_AUTH_SECRET ??= randomBytes(32).toString("hex");
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
