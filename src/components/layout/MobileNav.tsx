"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { AppRole } from "@/lib/domain";
import {
  ADMIN_NAV,
  ADMIN_PRIMARY,
  CUSTOMER_NAV,
  CUSTOMER_PRIMARY,
  STAFF_NAV,
  STAFF_PRIMARY,
  type NavItem,
} from "@/store/nav";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiSlice } from "@/store/slices/ui";

const PRIMARY_BY_ROLE: Record<AppRole, string[]> = {
  customer: CUSTOMER_PRIMARY,
  staff: STAFF_PRIMARY,
  admin: ADMIN_PRIMARY,
};

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  customer: CUSTOMER_NAV,
  staff: STAFF_NAV,
  admin: ADMIN_NAV,
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const role = useAppSelector((s) => s.auth.user?.role ?? "customer");
  const drawerOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  const dispatch = useAppDispatch();

  const nav = NAV_BY_ROLE[role];
  const primaryHrefs = PRIMARY_BY_ROLE[role];
  const primaryItems = primaryHrefs
    .map((href) => nav.find((n) => n.href === href))
    .filter((item): item is NavItem => item !== undefined);
  const moreItems = nav.filter((i) => !primaryHrefs.includes(i.href));
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav aria-label="Bottom navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-separator bg-surface px-4 py-2 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
                isActive(pathname, item.href) ? "text-accent" : "text-muted"
              }`}
            >
              <item.icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            aria-label="More"
            aria-expanded={drawerOpen}
            onClick={() => dispatch(uiSlice.actions.toggleMobileNav())}
            className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
              moreActive ? "text-accent" : "text-muted"
            }`}
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            aria-hidden="true"
            onClick={() => dispatch(uiSlice.actions.setMobileNavOpen(false))}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-xl border-t border-border bg-surface p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-default" />
            <ul className="flex flex-col gap-1">
              {moreItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                      isActive(pathname, item.href) ? "bg-brand-soft text-brand" : "text-foreground"
                    }`}
                    onClick={() => dispatch(uiSlice.actions.setMobileNavOpen(false))}
                  >
                    <item.icon aria-hidden="true" className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground"
              onClick={() => dispatch(uiSlice.actions.setMobileNavOpen(false))}
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}
