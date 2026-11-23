import { z } from "zod";

export const createRequestSchema = z.object({
  kind: z.enum(["deposit", "withdrawal"]),
  accountId: z.string().min(1),
  amount: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

export const approveRequestBody = z.object({
  note: z.string().max(300).optional(),
});

export const rejectRequestBody = z.object({
  reason: z.string().min(5).max(300),
});
