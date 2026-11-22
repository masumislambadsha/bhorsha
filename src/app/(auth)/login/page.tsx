import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-sm text-muted">Loading sign in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
