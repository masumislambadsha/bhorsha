import { randomBytes } from "node:crypto";
import type { AccountType } from "./domain";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ACCOUNT_TYPE_CODES: Record<AccountType, string> = {
  savings: "10",
  current: "20",
  business: "30",
};
const BRANCH_CODE = "11";

/** Luhn check digit for a digit string. */
export function luhnCheckDigit(digits: string): string {
  let sum = 0;
  let double = true;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  return luhnCheckDigit(digits.slice(0, -1)) === digits.slice(-1);
}

/** 11 = branch, type code, 7-digit sequence, Luhn check digit = 12 digits. */
export function buildAccountNumber(type: AccountType, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9_999_999) {
    throw new Error("Account sequence must be a 7-digit number.");
  }
  const body = `${BRANCH_CODE}${ACCOUNT_TYPE_CODES[type]}${String(sequence).padStart(7, "0")}`;
  return `${body}${luhnCheckDigit(body)}`;
}

/** TXN-YYMMDD-XXXXXX with Crockford base32 characters. */
export function generateReference(now: Date = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Array.from(randomBytes(6), (byte) => CROCKFORD[byte % CROCKFORD.length]).join("");
  return `TXN-${yy}${mm}${dd}-${suffix}`;
}
