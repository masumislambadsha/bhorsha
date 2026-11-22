import "server-only";

import { z } from "zod";
import { AppError } from "./errors";

/** Every money-moving POST must carry a UUID Idempotency-Key. */
export function requireIdempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key");
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Provide a valid Idempotency-Key header.");
  }
  return parsed.data;
}
