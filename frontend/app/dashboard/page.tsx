"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  UserCheck,
  UserRoundX,
  Users,
  Building2,
  Timer,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AttendanceActions } from "@/components/AttendanceActions";
import { DepartmentChart, PresenceChart, TrendChart } from "@/components/Charts";
import { DashboardCard, LoadingSpinner, PageHeading, StatusBadge } from "@/components/ui";
import { api } from "@/services/api";
import type { AdminDashboard, EmployeeDashboard, User } from "@/types/api";
import { formatDate, formatMinutes, formatTime } from "@/utils/format";

function EmployeeView({ user }: { user: User }) {
  const [data, setData] = useState<EmployeeDashboard | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<EmployeeDashboard>("/attendance/dashboard")
        .then(setData)
        .catch((cause) => setError(cause.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  if (!data && !error) return <LoadingSpinner />;
  if (error)
    return (
      <p role="alert" className="error-box">
        {error}
      </p>
    );
  if (!data) return null;
  const today = data.today;
  return (
    <>
      <PageHeading
        eyebrow="Personal dashboard"
        title={`Good day, ${user.name.split(" ")[0]}`}
        description={`${formatDate(today.date, today.timezone)} · ${today.timezone}`}
      />
      <div className="card mb-6 grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Today&apos;s status</p>
          <div className="mt-3 flex items-center gap-3">
            <h2 className="text-2xl font-semibold">
              {today.state === "checked_in"
                ? "You’re on the clock"
                : today.state === "checked_out"
                  ? "Workday complete"
                  : "Ready when you are"}
            </h2>
            <StatusBadge status={today.state} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Your time is recorded by the organization server.
          </p>
        </div>
        <AttendanceActions
          today={today}
          onChanged={() => {
            setError("");
            void load();
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Check in"
          value={formatTime(today.record?.check_in_time ?? null, today.timezone)}
          icon={<Clock3 size={21} />}
        />
        <DashboardCard
          label="Check out"
          value={formatTime(today.record?.check_out_time ?? null, today.timezone)}
          icon={<Timer size={21} />}
        />
        <DashboardCard
          label="Today’s hours"
          value={formatMinutes(today.record?.working_minutes ?? null)}
          icon={<CalendarDays size={21} />}
        />
        <DashboardCard
          label="Monthly hours"
          value={formatMinutes(data.total_working_minutes)}
          icon={<UserCheck size={21} />}
        />
      </div>
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">{data.month} attendance</h2>
          <Link
            href="/attendance"
            className="flex items-center gap-1 text-sm font-semibold text-brand"
          >
            View history <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="Days present" value={data.days_present} />
          <DashboardCard label="Days absent" value={data.days_absent} />
          <DashboardCard label="Days late" value={data.days_late} />
          <DashboardCard label="Leave days" value={data.leave_days} />
        </div>
      </div>
    </>
  );
}

function AdminView() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<AdminDashboard>("/admin/dashboard")
      .then(setData)
      .catch((cause) => setError(cause.message));
  }, []);
  if (!data && !error) return <LoadingSpinner />;
  if (error)
    return (
      <p role="alert" className="error-box">
        {error}
      </p>
    );
  if (!data) return null;
  return (
    <>
      <PageHeading
        eyebrow="Overview"
        title="Dashboard"
        description={`Attendance snapshot for ${formatDate(data.date, data.timezone)}`}
        action={
          <Link href="/reports" className="btn-secondary">
            View reports
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          label="Total employees"
          value={data.total_employees}
          icon={<Users size={21} />}
        />
        <DashboardCard
          label="Present today"
          value={data.present_today}
          icon={<UserCheck size={21} />}
        />
        <DashboardCard
          label="Absent today"
          value={data.absent_today}
          icon={<UserRoundX size={21} />}
        />
        <DashboardCard label="Late employees" value={data.late_today} icon={<Clock3 size={21} />} />
        <DashboardCard
          label="Currently checked in"
          value={data.currently_checked_in}
          icon={<Timer size={21} />}
        />
        <DashboardCard
          label="Departments"
          value={data.total_departments}
          icon={<Building2 size={21} />}
        />
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="section-title">Daily attendance trend</h2>
          <p className="mb-5 text-sm text-slate-500">Present employees over the past seven days</p>
          <TrendChart
            data={data.daily_trend.map((item) => ({
              date: item.date.slice(5),
              present: item.present,
            }))}
          />
        </div>
        <div className="card p-6">
          <h2 className="section-title">Monthly attendance trend</h2>
          <p className="mb-5 text-sm text-slate-500">Recorded present days over six months</p>
          <TrendChart data={data.monthly_trend} labelKey="month" />
        </div>
        <div className="card p-6">
          <h2 className="section-title">Department attendance</h2>
          <p className="mb-5 text-sm text-slate-500">Team presence today</p>
          <DepartmentChart data={data.department_attendance} />
        </div>
        <div className="card p-6">
          <h2 className="section-title">Present vs absent</h2>
          <p className="mb-5 text-sm text-slate-500">Current organization snapshot</p>
          <PresenceChart {...data.present_vs_absent} />
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      {(user) => (user.role === "admin" ? <AdminView /> : <EmployeeView user={user} />)}
    </AppShell>
  );
}
