import "server-only";

import { MongoClient } from "mongodb";
import { getServerEnv } from "@/server/env";

declare global {
  var __bhorsaMongoClient: MongoClient | undefined;
}

/**
 * Synchronous accessor: creating a MongoClient does not open a socket, so it is
 * safe to call while constructing Better Auth in either ESM or CJS scripts.
 * `connect()` is kicked off immediately and is idempotent on the driver.
 */
export function getMongoClientInstance(): MongoClient {
  if (!globalThis.__bhorsaMongoClient) {
    const client = new MongoClient(getServerEnv().MONGODB_URI, { maxPoolSize: 10 });
    globalThis.__bhorsaMongoClient = client;
    void client.connect();
  }
  return globalThis.__bhorsaMongoClient;
}

/** Awaited accessor for code that needs the connection ready before use. */
export function getMongoClient(): Promise<MongoClient> {
  return getMongoClientInstance().connect();
}
