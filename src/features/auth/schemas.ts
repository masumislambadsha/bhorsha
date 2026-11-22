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
