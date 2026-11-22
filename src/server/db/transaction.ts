import "server-only";

import type { ClientSession } from "mongoose";
import { connectDB } from "./mongoose";

/**
 * Run a callback in a MongoDB transaction. The callback may be retried, so it
 * must contain no external side effects (email, HTTP, logging of secrets).
 */
export async function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const conn = await connectDB();
  let result!: T;
  await conn.connection.transaction(
    async (session) => {
      result = await fn(session);
    },
    {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    },
  );
  return result;
}
