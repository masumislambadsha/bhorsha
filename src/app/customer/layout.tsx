import { redirect } from "next/navigation";
import { getServerSession, homeForRole, roleOf } from "@/server/auth/session";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/customer");
  const role = roleOf(session);
  if (role !== "customer") redirect(homeForRole(role));
  return <>{children}</>;
}
