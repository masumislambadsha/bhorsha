import { describe, expect, it } from "vitest";
import { buildAccountNumber, generateReference, isValidLuhn, luhnCheckDigit } from "@/lib/ids";

describe("identifiers", () => {
  it("computes and validates Luhn check digits", () => {
    const body = "11100001000";
    const check = luhnCheckDigit(body);
    expect(isValidLuhn(body + check)).toBe(true);
    expect(isValidLuhn(body + "0")).toBe(body + "0" === body + check);
  });

  it("builds 12-digit account numbers with branch and type codes", () => {
    const savings = buildAccountNumber("savings", 1);
    const business = buildAccountNumber("business", 42);
    expect(savings).toHaveLength(12);
    expect(savings.startsWith("1110")).toBe(true);
    expect(business.startsWith("1130")).toBe(true);
    expect(isValidLuhn(savings)).toBe(true);
    expect(isValidLuhn(business)).toBe(true);
  });

  it("generates references in the documented format", () => {
    const reference = generateReference(new Date("2026-11-22T10:00:00Z"));
    expect(reference).toMatch(/^TXN-261122-[0-9A-HJKMNP-TV-Z]{6}$/);
  });
});
