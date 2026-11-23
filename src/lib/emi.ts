/** Pure, unit-tested loan math (§8.6). */

export interface InstallmentDraft {
  principalMinor: number;
  interestMinor: number;
  amountDueMinor: number;
}

/** Monthly rate r = annualRateBps / 10000 / 12. */
export function monthlyRate(annualRateBps: number): number {
  return annualRateBps / 10_000 / 12;
}

/** EMI = P·r·(1+r)^n / ((1+r)^n − 1), or P/n when r = 0; rounded to whole paisa. */
export function emiOf(principalMinor: number, annualRateBps: number, durationMonths: number): number {
  const r = monthlyRate(annualRateBps);
  if (r <= 0 || durationMonths <= 0) return Math.round(principalMinor / Math.max(1, durationMonths));
  const n = durationMonths;
  const emi = (principalMinor * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/**
 * Build the repayment schedule month by month: `interest = round(balance × r)`,
 * `principal = emi − interest`; the last installment takes the exact remaining
 * principal. The principal components sum to P exactly.
 */
export function buildSchedule(principalMinor: number, emiMinor: number, durationMonths: number, annualRateBps: number): InstallmentDraft[] {
  const r = monthlyRate(annualRateBps);
  const schedule: InstallmentDraft[] = [];
  let balance = principalMinor;
  for (let n = 1; n <= durationMonths; n++) {
    const interest = r <= 0 ? 0 : Math.round(balance * r);
    let principal = n === durationMonths ? balance : emiMinor - interest;
    if (principal > balance) principal = balance;
    const amountDue = principal + interest;
    balance -= principal;
    if (balance < 0) balance = 0;
    schedule.push({ principalMinor: principal, interestMinor: interest, amountDueMinor: amountDue });
  }
  return schedule;
}

export function sumPrincipals(schedule: InstallmentDraft[]): number {
  return schedule.reduce((sum, i) => sum + i.principalMinor, 0);
}

export function sumInterests(schedule: InstallmentDraft[]): number {
  return schedule.reduce((sum, i) => sum + i.interestMinor, 0);
}
