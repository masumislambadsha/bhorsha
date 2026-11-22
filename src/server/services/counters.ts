import "server-only";

import type { ClientSession } from "mongoose";
import { Counter } from "@/server/db/models";

/** Atomically reserve the next 7-digit account sequence. */
export async function nextAccountSequence(session?: ClientSession): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: "accountNumber" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  ).lean();
  if (!counter) throw new Error("Could not allocate an account sequence.");
  if (counter.seq > 9_999_999) throw new Error("Account sequence exhausted.");
  return counter.seq;
}
