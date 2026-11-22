/** Shortened account number for lists: 111000010004 -> •••• 0004. */
export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  return `•••• ${digits.slice(-4)}`;
}

/** Full account number grouped in fours for detail pages. */
export function groupAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Mask a holder name for transfer lookup: "Rahim Uddin" -> "Ra*** Ud***". */
export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => `${part.slice(0, 2)}***`)
    .join(" ");
}
