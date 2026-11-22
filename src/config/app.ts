/** All brand strings live here so renaming the bank takes one edit. */
export const APP_NAME = "Bhorsa";
export const APP_TAGLINE = "Digital banking, simulated end to end";
export const SUPPORT_EMAIL = "support@bhorsa.demo";
export const SIMULATION_NOTICE =
  "Bhorsa is a simulated bank for demonstration. No real money moves.";

export const CURRENCY = "BDT";
export const TIME_ZONE = "Asia/Dhaka";

/** Demo credentials shown on the login page when NEXT_PUBLIC_SHOW_DEMO_LOGINS=true. */
export const DEMO_LOGINS = [
  { role: "Admin", email: "admin@bhorsa.demo", password: "Admin@1234" },
  { role: "Staff", email: "staff@bhorsa.demo", password: "Staff@1234" },
  { role: "Customer", email: "customer@bhorsa.demo", password: "Customer@1234" },
] as const;
