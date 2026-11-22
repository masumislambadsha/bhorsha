import { RoleHome } from "@/components/layout/RoleHome";
import { getServerSession } from "@/server/auth/session";

export default async function StaffHomePage() {
  const session = await getServerSession();
  return (
    <RoleHome
      title="Staff workspace"
      userName={session?.user.name ?? "Staff"}
      role="Bank staff"
    />
  );
}
