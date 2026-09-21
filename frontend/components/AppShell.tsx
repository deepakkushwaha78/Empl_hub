"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { LoadingSpinner } from "@/components/ui";
import type { User } from "@/types/api";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "employee"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin"] },
  { href: "/accounts", label: "Accounts", icon: UserRoundCog, roles: ["admin"] },
  { href: "/attendance", label: "Attendance", icon: CalendarDays, roles: ["admin", "employee"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { href: "/activity", label: "Activity", icon: History, roles: ["admin"] },
  { href: "/profile", label: "My profile", icon: UserRound, roles: ["admin", "employee"] },
];

export function AppShell({
  children,
  adminOnly = false,
}: {
  children: (user: User) => ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading, logout } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  if (loading || !user) return <LoadingSpinner />;
  const nav = (
    <>
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            E
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">Employee Hub</p>
            <p className="text-xs text-slate-400">Team workspace</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {navigation
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "bg-teal-50 text-brand" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  );
  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {nav}
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="flex h-full w-64 flex-col bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="text-sm font-medium text-slate-500">
              {user.role === "admin" ? "Admin workspace" : "Employee workspace"}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
            {user.role}
          </span>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          {adminOnly && user.role !== "admin" ? (
            <div className="card p-8">
              <h1 className="text-xl font-semibold">Access denied</h1>
              <p className="mt-2 text-sm text-slate-500">
                This page is available to administrators.
              </p>
            </div>
          ) : (
            children(user)
          )}
        </main>
      </div>
    </div>
  );
}
