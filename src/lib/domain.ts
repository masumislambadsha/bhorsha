/** Shared domain enums, safe to import from both client and server code. */

export const ACCOUNT_TYPES = ["savings", "current", "business"] as const;
export const ACCOUNT_STATUSES = ["active", "frozen", "closed"] as const;
export const TX_TYPES = ["deposit", "withdrawal", "transfer", "loan_disbursement", "loan_repayment"] as const;
export const TX_STATUSES = ["pending", "completed", "failed", "reversed"] as const;
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export const LOAN_TYPES = ["personal", "home", "car", "education", "business"] as const;
export const LOAN_STATUSES = ["pending", "under_review", "approved", "rejected", "active", "completed"] as const;
export const EMPLOYMENT_STATUSES = ["salaried", "self_employed", "business_owner", "student", "retired", "unemployed"] as const;
export const KYC_STATUSES = ["pending", "verified", "rejected"] as const;
export const CUSTOMER_STATUSES = ["active", "inactive"] as const;
export const APP_ROLES = ["admin", "staff", "customer"] as const;
export const FLAG_SEVERITIES = ["medium", "high"] as const;
export const FLAG_STATUSES = ["open", "cleared", "actioned"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type TxType = (typeof TX_TYPES)[number];
export type TxStatus = (typeof TX_STATUSES)[number];
export type LoanType = (typeof LOAN_TYPES)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export type AppRole = (typeof APP_ROLES)[number];
