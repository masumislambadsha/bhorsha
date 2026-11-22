"use client";

import { Button } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setError(null);
    setPending(true);
    try {
      // `phone` is a configured user additionalField; the cast keeps the
      // client free of a server-type import.
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone.replace(/^\+?880/, "0"),
      } as Parameters<typeof authClient.signUp.email>[0];
      const result = await authClient.signUp.email(payload);
      if (result.error) {
        setError(result.error.message ?? "We couldn't create your account. Check the details and try again.");
        return;
      }
      router.push("/customer");
      router.refresh();
    } catch {
      setError("We couldn't create your account. Check the details and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="font-display text-[28px] font-medium">Open an account</h1>
      <p className="mt-1 text-sm text-muted">Create your customer profile. Our staff will verify your details.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Full name
          <input autoComplete="name" className={fieldClass} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <span className="text-xs text-danger-soft-foreground">{errors.name.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input type="email" autoComplete="email" className={fieldClass} aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <span className="text-xs text-danger-soft-foreground">{errors.email.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className={fieldClass} aria-invalid={!!errors.phone} {...register("phone")} />
          {errors.phone && <span className="text-xs text-danger-soft-foreground">{errors.phone.message}</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <input type="password" autoComplete="new-password" className={fieldClass} aria-invalid={!!errors.password} {...register("password")} />
            {errors.password && <span className="text-xs text-danger-soft-foreground">{errors.password.message}</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Confirm password
            <input type="password" autoComplete="new-password" className={fieldClass} aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            {errors.confirmPassword && <span className="text-xs text-danger-soft-foreground">{errors.confirmPassword.message}</span>}
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" aria-invalid={!!errors.agreed} {...register("agreed")} />
          <span>I understand Bhorsa is a simulated bank.</span>
        </label>
        {errors.agreed && <span className="-mt-2 text-xs text-danger-soft-foreground">{errors.agreed.message}</span>}

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-foreground">{error}</p>
        )}

        <Button type="submit" variant="primary" fullWidth isPending={pending} isDisabled={pending}>
          Create profile
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already registered? <Link href="/login" className="font-medium text-link hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
