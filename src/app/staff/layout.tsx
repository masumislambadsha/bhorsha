import { redirect } from "next/navigation";
import { getServerSession, homeForRole, roleOf } from "@/server/auth/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/staff");
  const role = roleOf(session);
  if (role !== "staff" && role !== "admin") redirect(homeForRole(role));
  return <>{children}</>;
}
