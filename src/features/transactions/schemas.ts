import { z } from "zod";

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountNumber: z.string().min(1),
  amount: z.string().min(1),
  description: z.string().max(140).optional(),
  pin: z.string().min(4).max(6),
  confirmDuplicate: z.boolean().optional(),
});
