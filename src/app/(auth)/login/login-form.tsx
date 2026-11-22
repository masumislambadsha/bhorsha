"use client";

import { Button } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { DEMO_LOGINS } from "@/config/app";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function homeForRole(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/customer";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const nextPath = searchParams.get("next");
  const safeNext = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;

  async function onSubmit(values: LoginValues) {
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        setError("Email or password is incorrect.");
        return;
      }
      const role = (result.data?.user as { role?: string } | undefined)?.role;
      router.push(safeNext ?? homeForRole(role));
      router.refresh();
    } catch {
      setError("Email or password is incorrect.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="font-display text-[28px] font-medium">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use your Bhorsa account to continue.</p>

      {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true" && (
        <div className="mt-6 rounded-xl bg-surface-secondary p-3">
          <p className="text-xs font-medium text-muted">Try a demo account</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_LOGINS.map((demo) => (
              <button
                key={demo.role}
                type="button"
                onClick={() => {
                  setValue("email", demo.email, { shouldValidate: true });
                  setValue("password", demo.password, { shouldValidate: true });
                  setError(null);
                }}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {demo.role}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input type="email" autoComplete="email" className={fieldClass} aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <span className="text-xs text-danger-soft-foreground">{errors.email.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input type="password" autoComplete="current-password" className={fieldClass} aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <span className="text-xs text-danger-soft-foreground">{errors.password.message}</span>}
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-foreground">{error}</p>
        )}

        <Button type="submit" variant="primary" fullWidth isPending={pending} isDisabled={pending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href="/register" className="font-medium text-link hover:underline">Open an account</Link>
      </p>
    </div>
  );
}
