import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Bell,
  Building2,
  FileCheck,
  Home,
  LayoutDashboard,
  ListTodo,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const CUSTOMER_NAV: NavItem[] = [
  { href: "/customer", label: "Home", icon: Home },
  { href: "/customer/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/customer/transactions", label: "Activity", icon: Activity },
  { href: "/customer/loans", label: "Loans", icon: Banknote },
  { href: "/customer/notifications", label: "Notifications", icon: Bell },
  { href: "/customer/accounts", label: "Accounts", icon: Building2 },
  { href: "/customer/settings", label: "Settings", icon: Settings },
];

export const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "Home", icon: Home },
  { href: "/staff/customers", label: "Customers", icon: Users },
  { href: "/staff/queue", label: "Queue", icon: ListTodo },
  { href: "/staff/loans", label: "Loans", icon: Banknote },
  { href: "/staff/transactions", label: "Transactions", icon: Activity },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/staff/customers", label: "Customers", icon: Users },
  { href: "/admin/accounts", label: "Accounts", icon: Building2 },
  { href: "/admin/transactions", label: "Activity", icon: Activity },
  { href: "/admin/requests", label: "Requests", icon: FileCheck },
  { href: "/admin/loans", label: "Loans", icon: Banknote },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const CUSTOMER_PRIMARY = ["/customer", "/customer/transfer", "/customer/transactions", "/customer/loans"];
export const STAFF_PRIMARY = ["/staff", "/staff/customers", "/staff/queue", "/staff/loans"];
export const ADMIN_PRIMARY = ["/admin", "/staff/customers", "/admin/accounts", "/admin/transactions"];

export const NAV_BY_ROLE = {
  customer: CUSTOMER_NAV,
  staff: STAFF_NAV,
  admin: ADMIN_NAV,
} as const;
