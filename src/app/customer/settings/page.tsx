"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/ui/PageHeader";
import { PinInput } from "@/components/ui/PinInput";
import { useChangePinMutation, useMeQuery, useSetPinMutation, useUpdateProfileMutation } from "@/features/auth/api";
import { meUpdateProfileSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

export default function CustomerSettingsPage() {
  const { data: me } = useMeQuery();
  const [updateProfile, updateProfileResult] = useUpdateProfileMutation();
  const [setPin, setPinResult] = useSetPinMutation();
  const [changePin, changePinResult] = useChangePinMutation();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(meUpdateProfileSchema),
    values: me ? { phone: me.profile?.phone ?? "", address: me.profile?.address ?? "" } : undefined,
  });

  async function onProfile(values: { phone?: string; address?: string }) {
    const result = await updateProfile(values);
    setMessage(result.error ? (result.error.message ?? "Profile update failed.") : "Profile saved.");
  }

  async function onPassword() {
    setPasswordError(null);
    const result = await authClient.changePassword({ currentPassword: passwordCurrent, newPassword: passwordNew });
    if (result.error) {
      setPasswordError(result.error?.message ?? "Password change failed.");
      return;
    }
    setMessage("Password changed.");
  }

  async function onPin() {
    setPinError(null);
    try {
      const wasSet = me?.profile?.pinSet === true;
      if (wasSet) {
        await changePin({ currentPin, newPin }).unwrap();
      } else {
        await setPin(newPin).unwrap();
      }
      setCurrentPin("");
      setNewPin("");
      setMessage(wasSet ? "PIN changed." : "PIN set.");
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "PIN update failed.");
    }
  }

  const pinBusy = setPinResult.status === "pending" || changePinResult.status === "pending";

  return (
    <>
      <PageHeader title="Settings" description="Your profile, password and transaction PIN" />

      <div className="card p-6 md:p-8">
        <h2 className="font-display text-lg font-medium">Profile</h2>
        <form onSubmit={handleSubmit(onProfile)} className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Phone number
            <input
              {...register("phone")}
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <span className="text-xs text-danger-soft-foreground">{errors.phone.message}</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Address
            <input
              {...register("address")}
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              aria-invalid={!!errors.address}
            />
            {errors.address && <span className="text-xs text-danger-soft-foreground">{errors.address.message}</span>}
          </label>
          <Button type="submit" variant="primary" isPending={updateProfileResult.status === "pending"}>
            Save profile
          </Button>
        </form>
      </div>

      <div className="mt-6 card p-6 md:p-8">
        <h2 className="font-display text-lg font-medium">Change password</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Current password
            <input type="password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            New password
            <input type="password" value={passwordNew} onChange={(event) => setPasswordNew(event.target.value)} className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm" />
          </label>
        </div>
        <Button variant="primary" className="mt-4" isDisabled={passwordCurrent === "" || passwordNew === ""} onPress={onPassword}>
          Change password
        </Button>
        {passwordError && <p className="mt-3 text-sm text-danger-soft-foreground">{passwordError}</p>}
      </div>

      <div className="mt-6 card p-6 md:p-8">
        <h2 className="font-display text-lg font-medium">Transaction PIN</h2>
        <p className="mt-1 text-sm text-muted">The PIN is required before your first transfer or repayment. It cannot contain a single repeated digit like 1111. Sequences like 1234 are allowed.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {me?.profile?.pinSet ? "Current PIN" : "New PIN"}
            <PinInput value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {me?.profile?.pinSet ? "New PIN" : "Confirm PIN"}
            <PinInput value={newPin} onChange={(event) => setNewPin(event.target.value)} />
          </label>
        </div>
        <Button variant="primary" className="mt-4" isDisabled={currentPin.length < 4 || newPin.length < 4} isPending={pinBusy} onPress={onPin}>
          {me?.profile?.pinSet ? "Change PIN" : "Set PIN"}
        </Button>
        {pinError && <p className="mt-3 text-sm text-danger-soft-foreground">{pinError}</p>}
        {!pinError && message && <p className="mt-3 text-sm text-success-soft-foreground">{message}</p>}
      </div>
    </>
  );
}
