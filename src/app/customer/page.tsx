import { RoleHome } from "@/components/layout/RoleHome";
import { getServerSession } from "@/server/auth/session";

export default async function CustomerHomePage() {
  const session = await getServerSession();
  return (
    <RoleHome
      title="Your banking"
      userName={session?.user.name ?? "Customer"}
      role="Customer"
    />
  );
}
