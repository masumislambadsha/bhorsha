import { z } from "zod";
import { LOAN_TYPES, EMPLOYMENT_STATUSES } from "@/lib/domain";

export const createLoanSchema = z.object({
  loanType: z.enum(LOAN_TYPES),
  amount: z.string().min(1).max(50),
  durationMonths: z.number().int().min(1),
  monthlyIncome: z.string().min(1).max(50),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  description: z.string().min(20).max(500),
  disbursementAccountId: z.string().min(1),
});

export const addLoanNoteSchema = z.object({
  body: z.string().min(1).max(500),
});

export const forwardLoanSchema = z.object({
  recommendation: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

export const rejectLoanSchema = z.object({
  reason: z.string().min(5).max(300),
});

export const repayLoanSchema = z.object({
  fromAccountId: z.string().min(1),
  pin: z.string().min(4).max(6),
  mode: z.enum(["next_installment", "payoff"]),
});
