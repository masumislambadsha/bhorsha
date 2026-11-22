import { describe, expect, it } from "vitest";
import { calculateEmi, payoffMinor } from "@/lib/emi";

const first = new Date("2026-12-22T00:00:00Z");

describe("EMI schedule", () => {
  it("sums principal components exactly to the principal", () => {
    const principal = 100_000_00;
    const plan = calculateEmi(principal, 1200, 12, first);
    expect(plan.schedule).toHaveLength(12);
    expect(plan.schedule.reduce((sum, row) => sum + row.principalMinor, 0)).toBe(principal);
    expect(plan.totalPayableMinor).toBe(principal + plan.totalInterestMinor);
  });

  it("adjusts the last installment to clear the remaining balance", () => {
    const plan = calculateEmi(1_000_00, 1300, 7, first);
    const last = plan.schedule.at(-1);
    expect(last?.n).toBe(7);
    expect(last?.principalMinor).toBeGreaterThan(0);
    expect(last?.amountDueMinor).toBe(last!.principalMinor + last!.interestMinor);
  });

  it("supports zero interest", () => {
    const plan = calculateEmi(1_000_00, 0, 6, first);
    expect(plan.emiMinor).toBe(16667);
    expect(plan.totalInterestMinor).toBe(0);
    expect(plan.schedule.reduce((sum, row) => sum + row.principalMinor, 0)).toBe(1_000_00);
    expect(payoffMinor(plan.schedule.filter((row) => row.n > 2))).toBe(
      1_000_00 - plan.schedule.slice(0, 2).reduce((sum, row) => sum + row.principalMinor, 0),
    );
  });
});
