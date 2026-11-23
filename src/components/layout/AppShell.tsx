"use client";

import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/customer": "Your banking",
  "/customer/accounts": "Accounts",
  "/customer/transfer": "Transfer",
  "/customer/transactions": "Activity",
  "/customer/requests": "Requests",
  "/customer/loans": "Loans",
  "/customer/notifications": "Notifications",
  "/customer/settings": "Settings",
  "/staff": "Home",
  "/staff/customers": "Customers",
  "/staff/queue": "Queue",
  "/staff/loans": "Loans",
  "/staff/transactions": "Transactions",
  "/admin": "Overview",
  "/admin/accounts": "Accounts",
  "/admin/transactions": "Activity",
  "/admin/requests": "Requests",
  "/admin/loans": "Loans",
  "/admin/audit-log": "Audit log",
  "/admin/settings": "Settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useAppSelector((s) => s.auth.user?.role ?? "customer");
  const title = PAGE_TITLES[pathname] ?? "Bhorsa";
  return (
    <>
      <Topbar title={title} role={role} />
      <Sidebar />
      <main id="main" className="min-h-dvh bg-background md:pl-14 lg:pl-[264px]">
        <div className="px-4 py-6 md:px-8 lg:px-10">{children}</div>
      </main>
      <MobileNav />
    </>
  );
}
