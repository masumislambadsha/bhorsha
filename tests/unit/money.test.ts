import { describe, expect, it } from "vitest";
import { formatBDT, fromMinor, toMinor } from "@/lib/money";

describe("money utilities", () => {
  it("parses taka strings into integer paisa", () => {
    expect(toMinor("1234.50")).toBe(123450);
    expect(toMinor("7")).toBe(700);
    expect(toMinor("0.05")).toBe(5);
  });

  it("rejects invalid amounts", () => {
    expect(() => toMinor("0")).toThrow();
    expect(() => toMinor("-5")).toThrow();
    expect(() => toMinor("1.234")).toThrow();
    expect(() => toMinor("1e3")).toThrow();
  });

  it("formats with lakh grouping and a narrow taka symbol", () => {
    expect(formatBDT(24835000)).toBe("৳2,48,350.00");
    expect(fromMinor(123450)).toBe("1234.50");
  });
});
