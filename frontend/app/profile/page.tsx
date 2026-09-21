"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Building2, CalendarDays, Mail, Phone, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingSpinner, PageHeading, StatusBadge } from "@/components/ui";
import { api } from "@/services/api";
import type { Employee, User } from "@/types/api";
import { formatDate } from "@/utils/format";

function ProfileView({ user }: { user: User }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(Boolean(user.employee_id));
  const [error, setError] = useState("");
  useEffect(() => {
    if (user.employee_id)
      api<Employee>(`/employees/${user.employee_id}`)
        .then(setEmployee)
        .catch((cause) => setError(cause.message))
        .finally(() => setLoading(false));
  }, [user.employee_id]);
  if (loading) return <LoadingSpinner />;
  return (
    <>
      <PageHeading
        eyebrow="Account"
        title="My profile"
        description="Your work and account details."
      />
      {error && (
        <p role="alert" className="error-box mb-4">
          {error}
        </p>
      )}
      <div className="card max-w-3xl overflow-hidden">
        <div className="flex items-center gap-5 border-b border-slate-100 bg-slate-50 px-6 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-brand">
            <UserRound size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{user.name}</h2>
            <p className="mt-1 text-sm capitalize text-slate-500">
              {employee?.designation ?? user.role}
            </p>
          </div>
          <span className="ml-auto">
            <StatusBadge status={employee?.is_active === false ? "inactive" : "active"} />
          </span>
        </div>
        <dl className="grid gap-6 p-6 sm:grid-cols-2">
          {[
            [Mail, "Email", user.email],
            [BriefcaseBusiness, "Employee ID", employee?.employee_code ?? "—"],
            [Building2, "Department", employee?.department ?? "—"],
            [Phone, "Phone", employee?.phone ?? "—"],
            [CalendarDays, "Joining date", employee ? formatDate(employee.joining_date) : "—"],
            [UserRound, "Role", user.role],
          ].map(([Icon, label, value], index) => {
            const Component = Icon as typeof Mail;
            return (
              <div key={index} className="flex items-start gap-3">
                <Component size={18} className="mt-1 text-brand" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {label as string}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold capitalize text-slate-800">
                    {value as string}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return <AppShell>{(user) => <ProfileView user={user} />}</AppShell>;
}
