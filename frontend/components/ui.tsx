"use client";

import type { ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Attendance, AttendanceStatus, Employee } from "@/types/api";
import { formatDate, formatMinutes, formatTime, statusLabel } from "@/utils/format";

export function DashboardCard({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  note?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
        </div>
        {icon && <span className="rounded-xl bg-teal-50 p-3 text-brand">{icon}</span>}
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div
      className="flex min-h-[280px] items-center justify-center text-brand"
      role="status"
      aria-label="Loading"
    >
      <LoaderCircle className="h-7 w-7 animate-spin" />
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status:
    AttendanceStatus | "active" | "inactive" | "checked_in" | "checked_out" | "not_checked_in";
}) {
  const text =
    status in { active: 1, inactive: 1, checked_in: 1, checked_out: 1, not_checked_in: 1 }
      ? status.replaceAll("_", " ")
      : statusLabel(status as AttendanceStatus);
  const className = ["present", "active", "checked_in", "work_from_home"].includes(status)
    ? "bg-emerald-50 text-emerald-700"
    : ["late", "half_day"].includes(status)
      ? "bg-amber-50 text-amber-700"
      : ["absent", "inactive"].includes(status)
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {text}
    </span>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-xl"
    >
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
}

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DateRangeFilter({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-slate-500">
        From{" "}
        <input
          aria-label="Start date"
          className="input ml-2"
          type="date"
          value={start}
          onChange={(event) => onStart(event.target.value)}
        />
      </label>
      <label className="text-sm text-slate-500">
        To{" "}
        <input
          aria-label="End date"
          className="input ml-2"
          type="date"
          value={end}
          onChange={(event) => onEnd(event.target.value)}
        />
      </label>
    </div>
  );
}

export function AttendanceTable({
  rows,
  timezone,
  admin = false,
  onEditStatus,
}: {
  rows: Attendance[];
  timezone: string;
  admin?: boolean;
  onEditStatus?: (item: Attendance) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {admin && (
              <>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Department</th>
              </>
            )}
            <th>Date</th>
            <th>Check in</th>
            <th>Check out</th>
            <th>Working hours</th>
            <th>Status</th>
            {onEditStatus && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              {admin && (
                <>
                  <td className="font-medium">{item.employee_code}</td>
                  <td>{item.employee_name}</td>
                  <td>{item.department ?? "—"}</td>
                </>
              )}
              <td>{formatDate(item.attendance_date, timezone)}</td>
              <td>{formatTime(item.check_in_time, timezone)}</td>
              <td>{formatTime(item.check_out_time, timezone)}</td>
              <td>{formatMinutes(item.working_minutes)}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              {onEditStatus && (
                <td>
                  <button
                    className="text-sm font-semibold text-brand hover:underline"
                    onClick={() => onEditStatus(item)}
                  >
                    Edit status
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">No attendance records found.</p>
      )}
    </div>
  );
}

export function EmployeeTable({
  rows,
  onEdit,
  onToggle,
}: {
  rows: Employee[];
  onEdit: (employee: Employee) => void;
  onToggle: (employee: Employee) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>ID</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="font-semibold text-slate-800">{item.name}</span>
                <span className="block text-xs text-slate-500">{item.email}</span>
              </td>
              <td>{item.employee_code}</td>
              <td>{item.department ?? "—"}</td>
              <td>{item.designation}</td>
              <td>{formatDate(item.joining_date)}</td>
              <td>
                <StatusBadge status={item.is_active ? "active" : "inactive"} />
              </td>
              <td>
                <div className="flex gap-3">
                  <button
                    className="text-sm font-semibold text-brand hover:underline"
                    onClick={() => onEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-sm font-semibold text-slate-500 hover:underline"
                    onClick={() => onToggle(item)}
                  >
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">No employees found.</p>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
