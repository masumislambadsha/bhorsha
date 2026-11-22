import { beforeAll, describe, expect, it } from "vitest";
import { CustomerProfile } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { changePin, setPin, verifyPin } from "@/server/services/pin";

const actor = { id: "cust-p", role: "customer" as const };

describe("transaction PIN", () => {
  beforeAll(async () => {
    await connectDB();
    await CustomerProfile.insertMany([
      { userId: "cust-p", kycStatus: "verified", status: "active" },
      { userId: "cust-q", kycStatus: "verified", status: "active" },
    ]);
  });

  it("rejects repeated-digit pins", async () => {
    await expect(setPin(actor, "cust-q", "1111")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(setPin(actor, "cust-q", "2222")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("sets, verifies, and changes a PIN", async () => {
    await setPin(actor, "cust-p", "1234");
    await verifyPin(actor, "cust-p", "1234");
    await changePin(actor, "cust-p", "1234", "4321");
    await verifyPin(actor, "cust-p", "4321");
    await expect(verifyPin(actor, "cust-p", "1234")).rejects.toMatchObject({ code: "INVALID_PIN" });
    await expect(setPin(actor, "cust-p", "5678")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("locks after five failures", async () => {
    // Test 2 left one failure, so four more reach the limit.
    for (let i = 0; i < 4; i += 1) {
      await expect(verifyPin(actor, "cust-p", "0000")).rejects.toMatchObject({ code: "INVALID_PIN" });
    }
    // The fourth loop iteration reaches the limit of five failures and locks the PIN.
    // While locked, further attempts return PIN_LOCKED.
    await expect(verifyPin(actor, "cust-p", "0000")).rejects.toMatchObject({ code: "PIN_LOCKED" });
  });
});
