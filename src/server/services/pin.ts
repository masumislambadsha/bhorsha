import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Actor } from "@/server/auth/guards";
import { CustomerProfile } from "@/server/db/models";
import { AppError } from "@/server/http/errors";
import { writeAuditLog } from "./audit";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const PIN_LOCKOUT_MS = 15 * 60 * 1000;
const PIN_MAX_FAILURES = 5;

interface PinView {
  pin?: { hash: string; setAt: Date; failedAttempts: number; lockedUntil: Date | null } | null;
}

/** 4–6 digits; pins that are one repeated digit are rejected outright. */
export function validatePin(pin: string): void {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError("VALIDATION_ERROR", "Enter a 4–6 digit PIN.", { fieldErrors: { pin: ["Enter a 4–6 digit PIN."] } });
  }
  if (new Set(pin).size === 1) {
    throw new AppError("VALIDATION_ERROR", "Choose a PIN that isn't a single repeated digit.", {
      fieldErrors: { pin: ["PINs like 1111 are not allowed."] },
    });
  }
}

async function storePin(customerId: string, pin: string): Promise<void> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 64);
  const stored = `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
  await CustomerProfile.updateOne(
    { userId: customerId },
    {
      $set: { "pin.hash": stored, "pin.setAt": new Date(), "pin.failedAttempts": 0, "pin.lockedUntil": null },
    },
  );
}

async function getProfileWithPin(customerId: string): Promise<PinView | null> {
  const profile = await CustomerProfile.findOne({ userId: customerId }).select("pin").lean();
  return profile as unknown as PinView | null;
}

/** POST /api/me/pin — requires no PIN already set. */
export async function setPin(actor: Actor, customerId: string, pin: string): Promise<void> {
  validatePin(pin);
  const existing = await getProfileWithPin(customerId);
  if (existing?.pin?.hash) throw new AppError("CONFLICT", "A transaction PIN is already set. Use change to update it.");
  await storePin(customerId, pin);
  await writeAuditLog(actor, { action: "PIN_SET", entityType: "customer_profile", entityId: customerId, summary: "Transaction PIN set." });
}

/** PUT /api/me/pin — verify the current PIN, then store the new one. */
export async function changePin(actor: Actor, customerId: string, currentPin: string, newPin: string): Promise<void> {
  const profile = await getProfileWithPin(customerId);
  if (!profile?.pin?.hash) throw new AppError("PIN_NOT_SET", "Set a transaction PIN first.");
  await verifyPin(actor, customerId, currentPin);
  validatePin(newPin);
  await storePin(customerId, newPin);
  await writeAuditLog(actor, { action: "PIN_CHANGED", entityType: "customer_profile", entityId: customerId, summary: "Transaction PIN changed." });
}

/** Verify a PIN; throws INVALID_PIN (with remaining attempts) or PIN_LOCKED. */
export async function verifyPin(actor: Actor, customerId: string, pin: string): Promise<void> {
  const profile = await getProfileWithPin(customerId);
  if (!profile?.pin?.hash) throw new AppError("PIN_NOT_SET", "Set a transaction PIN first.");
  const lockedUntil = profile.pin.lockedUntil ? new Date(profile.pin.lockedUntil) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    throw new AppError("PIN_LOCKED", "Too many incorrect PIN attempts. Try again after the lockout.", {
      details: { unlockAt: lockedUntil },
    });
  }
  const parts = profile.pin.hash.split("$");
  const salt = Buffer.from(parts[1] ?? "", "base64");
  const expected = Buffer.from(parts[2] ?? "", "base64");
  const actual = await scrypt(pin, salt, 64);
  if (timingSafeEqual(actual, expected)) {
    await CustomerProfile.updateOne({ userId: customerId }, { $set: { "pin.failedAttempts": 0 } });
    return;
  }
  const updated = (await CustomerProfile.findOneAndUpdate(
    { userId: customerId },
    { $inc: { "pin.failedAttempts": 1 } },
    { new: true },
  ).select("pin").lean()) as unknown as PinView | null;
  const failures = updated?.pin?.failedAttempts ?? 1;
  if (failures >= PIN_MAX_FAILURES) {
    const until = new Date(Date.now() + PIN_LOCKOUT_MS);
    await CustomerProfile.updateOne({ userId: customerId }, { $set: { "pin.lockedUntil": until } });
    await writeAuditLog(actor, {
      action: "PIN_LOCKED",
      entityType: "customer_profile",
      entityId: customerId,
      summary: "Transaction PIN locked after repeated failures.",
      after: { failedAttempts: failures, unlockAt: until },
    });
  }
  const remaining = Math.max(0, PIN_MAX_FAILURES - failures);
  throw new AppError("INVALID_PIN", `Incorrect PIN. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`, {
    details: { remaining },
  });
}
