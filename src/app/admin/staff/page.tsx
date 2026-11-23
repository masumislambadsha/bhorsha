"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCreateStaffMutation, useListStaffQuery } from "@/features/admin/api";
import { formatDate } from "@/lib/time";
import { useAppSelector } from "@/store/hooks";

export default function AdminStaffPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data, isLoading } = useListStaffQuery();
  const [create, result] = useCreateStaffMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (role !== "admin") return null;

  return (
    <>
      <PageHeader title="Staff" description="Create and review staff accounts." />
      <div className="card max-w-xl p-6">
        <h2 className="font-display text-lg font-medium">Add a staff user</h2>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create({ name, email, password });
            setName(""); setEmail(""); setPassword("");
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Temporary password (12+ characters)
            <input required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <Button type="submit" variant="primary" isPending={result.isLoading}>Create staff user</Button>
          {result.isSuccess && <p className="text-sm text-success-soft-foreground">Staff user created.</p>}
        </form>
      </div>
      <div className="card mt-6 p-5">
        <h2 className="font-display text-lg font-medium">Existing staff</h2>
        {isLoading ? <p className="mt-3 text-sm text-muted">Loading…</p> : (
          <ul className="mt-4 divide-y divide-separator">
            {(data?.items ?? []).map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span><strong className="font-medium">{user.name}</strong><span className="ml-2 text-muted">{user.email}</span></span>
                <span className="text-muted">{user.role} · joined {formatDate(user.createdAt)}</span>
              </li>
            ))}
            {(data?.items ?? []).length === 0 && <li className="py-3 text-sm text-muted">No staff users yet.</li>}
          </ul>
        )}
      </div>
    </>
  );
}
