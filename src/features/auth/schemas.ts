import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Enter your email address." }),
  password: z.string({ error: "Enter your password." }).min(8, "Password must be at least 8 characters."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string({ error: "Enter your name." }).min(2, "Enter your full name."),
    email: z.email({ error: "Enter a valid email address." }),
    phone: z
      .string({ error: "Enter your phone number." })
      .regex(/^(?:\+?880)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number."),
    password: z
      .string({ error: "Choose a password." })
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
    confirmPassword: z.string({ error: "Confirm your password." }),
    agreed: z.literal(true, { error: "Confirm that you understand this is a simulation." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const pinSchema = z.object({
  pin: z.string({ error: "Enter a 4–6 digit PIN." }).min(4, "Enter a 4–6 digit PIN.").max(6, "Enter a 4–6 digit PIN."),
});

export const changePinSchema = z.object({
  currentPin: z.string({ error: "Enter the current PIN." }).min(4).max(6),
  newPin: z.string({ error: "Enter the new PIN." }).min(4, "Enter a 4–6 digit PIN.").max(6, "Enter a 4–6 digit PIN."),
});

export const meUpdateProfileSchema = z.object({
  phone: z.string({ error: "Enter the customer's Bangladesh mobile number." }).regex(/^(\+880|0)?1[3-9]\d{8}$/, "Enter the customer's Bangladesh mobile number.").optional(),
  address: z.string({ error: "Enter an address." }).max(200).optional(),
});
