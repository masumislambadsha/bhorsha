import "server-only";

import mongoose from "mongoose";
import { getServerEnv } from "@/server/env";

declare global {
  var __bhorsaMongoose: Promise<typeof mongoose> | undefined;
}

/** One cached Mongoose connection for all app collections and money operations. */
export function connectDB(): Promise<typeof mongoose> {
  if (!globalThis.__bhorsaMongoose) {
    globalThis.__bhorsaMongoose = mongoose.connect(getServerEnv().MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }
  return globalThis.__bhorsaMongoose;
}
