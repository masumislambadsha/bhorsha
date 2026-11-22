import "server-only";

import { MongoClient } from "mongodb";
import { getServerEnv } from "@/server/env";

declare global {
  var __bhorsaMongoClient: Promise<MongoClient> | undefined;
}

/** One native MongoClient for Better Auth, cached across hot reloads. */
export function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__bhorsaMongoClient) {
    globalThis.__bhorsaMongoClient = new MongoClient(getServerEnv().MONGODB_URI, {
      maxPoolSize: 10,
    }).connect();
  }
  return globalThis.__bhorsaMongoClient;
}
