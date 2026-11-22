import { RoleHome } from "@/components/layout/RoleHome";
import { getServerSession } from "@/server/auth/session";

export default async function AdminHomePage() {
  const session = await getServerSession();
  return (
    <RoleHome
      title="Bank overview"
      userName={session?.user.name ?? "Admin"}
      role="Administrator"
    />
  );
}
