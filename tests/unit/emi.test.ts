import { describe, expect, it } from "vitest";
import { buildSchedule, emiOf, sumInterests, sumPrincipals } from "@/lib/emi";

describe("EMI (§8.6)", () => {
  it("computes EMI for a standard loan and schedules principal that sums to P", () => {
    const principal = 1_000_000; // ৳10,000
    const rate = 1_200; // 12.00%
    const months = 60;
    const emi = emiOf(principal, rate, months);
    expect(emi).toBeGreaterThan(0);
    const schedule = buildSchedule(principal, emi, months, rate);
    expect(schedule).toHaveLength(months);
    expect(sumPrincipals(schedule)).toBe(principal);
    // Last installment takes the exact remaining principal.
    expect(schedule[months - 1].principalMinor).toBeGreaterThan(0);
    expect(sumInterests(schedule)).toBeGreaterThan(0);
    expect(sumInterests(schedule)).toBeLessThanOrEqual(sumPrincipals(schedule) * 10);
  });

  it("r = 0 works: EMI = P/n and equal installments", () => {
    const emi = emiOf(10_000, 0, 3);
    expect(emi).toBe(3333); // 3333.33 → 3333?
    const schedule = buildSchedule(10_000, emi, 3, 0);
    expect(sumPrincipals(schedule)).toBe(10_000);
    expect(schedule.map((i) => i.principalMinor).sort()).toEqual([3333, 3333, 3334]);
  });

  it("handles a tiny loan over many months without negative principal", () => {
    const schedule = buildSchedule(500, 50, 60, 1_200);
    expect(sumPrincipals(schedule)).toBe(500);
    expect(schedule.every((i) => i.principalMinor >= 0)).toBe(true);
  });
});
