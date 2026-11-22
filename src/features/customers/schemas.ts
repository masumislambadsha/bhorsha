import { z } from "zod";

export const customerRegisterSchema = z.object({
  name: z.string({ error: "Enter the customer's full name." }).min(2, "Enter the customer's full name.").max(80),
  email: z.email({ error: "Enter a valid email address." }).max(200),
  phone: z
    .string({ error: "Enter the customer's Bangladesh mobile number." })
    .regex(/^(?:\+880)?01[3-9]\d{8}$/, "Enter the customer's Bangladesh mobile number.")
    .optional(),
  address: z.string({ error: "Enter an address." }).max(200).optional(),
  dateOfBirth: z.string({ error: "Enter a valid date of birth." }).datetime({ error: "Enter a valid date of birth." }).optional(),
  occupation: z.string({ error: "Enter an occupation." }).max(100).optional(),
});

export const kycDecisionSchema = z.object({
  decision: z.enum(["verified", "rejected"]),
  note: z.string({ error: "Enter a note." }).max(500).optional(),
});

export const customerStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
  reason: z.string({ error: "Enter a reason." }).max(200).optional(),
});

export const blockCustomerSchema = z.object({
  reason: z.string({ error: "Enter a reason." }).min(1).max(200),
  freezeAccounts: z.boolean().optional(),
});
