/** Pure EMI math. All stored amounts are whole paisa. */

export interface ScheduleRow {
  n: number;
  dueDate: Date;
  principalMinor: number;
  interestMinor: number;
  amountDueMinor: number;
}

export interface EmiPlan {
  emiMinor: number;
  totalInterestMinor: number;
  totalPayableMinor: number;
  schedule: ScheduleRow[];
}

function addMonths(date: Date, months: number): Date {
  const utc = new Date(date.getTime());
  const day = utc.getUTCDate();
  utc.setUTCDate(1);
  utc.setUTCMonth(utc.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() + 1, 0)).getUTCDate();
  utc.setUTCDate(Math.min(day, lastDay));
  return utc;
}

/**
 * Amortised schedule. `firstDueDate` is the date of installment 1; the caller
 * passes one month after disbursement.
 */
export function calculateEmi(
  principalMinor: number,
  annualRateBps: number,
  durationMonths: number,
  firstDueDate: Date,
): EmiPlan {
  if (!Number.isInteger(principalMinor) || principalMinor <= 0) {
    throw new Error("Principal must be a positive whole number of paisa.");
  }
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new Error("Duration must be a positive number of months.");
  }

  const r = annualRateBps / 10000 / 12;
  const emiMinor =
    r === 0
      ? Math.round(principalMinor / durationMonths)
      : Math.round((principalMinor * r * (1 + r) ** durationMonths) / ((1 + r) ** durationMonths - 1));

  const schedule: ScheduleRow[] = [];
  let balance = principalMinor;
  let totalInterest = 0;

  for (let n = 1; n <= durationMonths; n += 1) {
    const interest = Math.round(balance * r);
    const principal = n === durationMonths ? balance : Math.min(balance, Math.max(1, emiMinor - interest));
    const actualPrincipal = Math.min(principal, balance);
    schedule.push({
      n,
      dueDate: addMonths(firstDueDate, n - 1),
      principalMinor: actualPrincipal,
      interestMinor: interest,
      amountDueMinor: actualPrincipal + interest,
    });
    totalInterest += interest;
    balance -= actualPrincipal;
  }

  return {
    emiMinor,
    totalInterestMinor: totalInterest,
    totalPayableMinor: principalMinor + totalInterest,
    schedule,
  };
}

/** Remaining principal across unpaid installments; paying this early skips future interest. */
export function payoffMinor(schedule: ScheduleRow[]): number {
  return schedule.reduce((sum, row) => sum + row.principalMinor, 0);
}
