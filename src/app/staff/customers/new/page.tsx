"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCreateCustomerMutation } from "@/features/customers/api";
import { customerRegisterSchema } from "@/features/customers/schemas";
import type { CreateCustomerInput } from "@/features/customers/types";

export default function StaffRegisterCustomerPage() {
  const [create, createResult] = useCreateCustomerMutation();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerInput>({ resolver: zodResolver(customerRegisterSchema) });

  async function onSubmit(values: CreateCustomerInput) {
    const result = await create(values);
    if ("error" in result) return;
    setTempPassword(result.data?.tempPassword ?? null);
  }

  function copyPassword() {
    if (!tempPassword) return;
    void navigator.clipboard.writeText(tempPassword).then(() => setCopied(true)).catch(() => undefined);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader title="Register customer" description="Enter the customer's details. They will receive a temporary password once." />
      <div className="card p-6 md:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Name
              <input {...register("name")} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.name} />
              {errors.name && <span className="text-xs text-danger-soft-foreground">{errors.name.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input {...register("email")} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.email} />
              {errors.email && <span className="text-xs text-danger-soft-foreground">{errors.email.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Bangladesh mobile number
              <input {...register("phone")} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.phone} />
              {errors.phone && <span className="text-xs text-danger-soft-foreground">{errors.phone.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Address
              <input {...register("address")} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.address} />
              {errors.address && <span className="text-xs text-danger-soft-foreground">{errors.address.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Date of birth (YYYY-MM-DD)
              <input {...register("dateOfBirth")} placeholder="1990-01-15" className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.dateOfBirth} />
              {errors.dateOfBirth && <span className="text-xs text-danger-soft-foreground">{errors.dateOfBirth.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Occupation
              <input {...register("occupation")} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" aria-invalid={!!errors.occupation} />
              {errors.occupation && <span className="text-xs text-danger-soft-foreground">{errors.occupation.message}</span>}
            </label>
          </div>
          {createResult.isError && <p className="text-sm text-danger-soft-foreground">{createResult.error?.message ?? "Registration failed."}</p>}
          <Button type="submit" variant="primary" isPending={createResult.status === "pending"} isDisabled={createResult.status === "pending"}>
            Register customer
          </Button>
        </form>

        {tempPassword && (
          <div className="mt-6 rounded-xl border border-border bg-surface-secondary p-4">
            <p className="text-sm font-medium">Temporary password — share once</p>
            <p className="mt-1 text-sm text-muted">The customer uses this password at their first sign-in. They can change it later.</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-sm">
              <span className="truncate">{tempPassword}</span>
              <button type="button" onClick={copyPassword} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-secondary">
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
