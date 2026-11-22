import { PageHeader } from "@/components/ui/PageHeader";
import { SIMULATION_NOTICE } from "@/config/app";
import { SignOutButton } from "./SignOutButton";

export function RoleHome({
  title,
  userName,
  role,
}: {
  title: string;
  userName: string;
  role: string;
}) {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={title}
        description={`Signed in as ${userName} · ${role}`}
        actions={<SignOutButton />}
      />
      <div className="card p-6">
        <h2 className="font-display text-xl font-medium">Your workspace is ready</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Authentication and server-side role checks are active. Banking tools are added in the following phases.
        </p>
        <p className="mt-6 text-xs text-muted">{SIMULATION_NOTICE}</p>
      </div>
    </main>
  );
}
