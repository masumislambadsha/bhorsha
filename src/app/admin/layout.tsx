import { redirect } from "next/navigation";
import { getServerSession, homeForRole, roleOf } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/admin");
  if (roleOf(session) !== "admin") redirect(homeForRole(roleOf(session)));
  return <>{children}</>;
}
