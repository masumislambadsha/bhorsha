import { redirect } from "next/navigation";
import type { AuthUser } from "@/store/slices/auth";
import { AppShell } from "@/components/layout/AppShell";
import { StoreProvider } from "@/store/StoreProvider";
import { getServerSession, homeForRole, roleOf } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/admin");
  const role = roleOf(session);
  if (role !== "admin") redirect(homeForRole(roleOf(session)));
  const user: AuthUser = { id: session.user.id, name: session.user.name, email: session.user.email, role };
  return (
    <StoreProvider user={user}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
