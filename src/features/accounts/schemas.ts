import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/domain";

export const openAccountSchema = z.object({
  customerId: z.string({ error: "Select a customer." }).min(1),
  type: z.enum(ACCOUNT_TYPES, { error: "Select an account type." }),
  nickname: z.string({ error: "Enter a nickname." }).max(50).optional(),
});

export const updateAccountSchema = z.object({
  nickname: z.string({ error: "Enter a nickname." }).max(50),
});

export const freezeSchema = z.object({
  reason: z.string({ error: "Enter a reason." }).min(1).max(200),
});

export const unfreezeSchema = z.object({});

export const limitsUpdateSchema = z.object({
  perTransactionMinor: z.number().int().min(0).optional(),
  dailyTransferMinor: z.number().int().min(0).optional(),
  minimumBalanceMinor: z.number().int().min(0).optional(),
  confirmMinimumBalance: z.boolean().optional(),
});

export const accountLookupSchema = z.object({
  number: z.string({ error: "Enter the account number." }).min(1).max(12),
});
