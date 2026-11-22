import { CURRENCY } from "@/config/app";

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY,
  currencyDisplay: "narrowSymbol",
});

/** 123450 -> "৳1,234.50" (lakh grouping). */
export function formatBDT(minor: number): string {
  return formatter.format(minor / 100);
}

/** Plain decimal string for CSV and PDF output, where ৳ is unavailable. */
export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Parse a decimal taka string into integer paisa without floating-point math.
 * Accepts 1-10 integer digits and 1-2 decimals; rejects zero and negatives.
 */
export function toMinor(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) {
    throw new Error("Enter an amount in taka with at most two decimals.");
  }
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (amount <= 0) throw new Error("Enter an amount greater than zero.");
  return amount;
}
