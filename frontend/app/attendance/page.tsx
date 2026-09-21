"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  AttendanceTable,
  DateRangeFilter,
  LoadingSpinner,
  PageHeading,
  Toast,
} from "@/components/ui";
import { api, query } from "@/services/api";
import type { Attendance, Department, Employee, Page, User } from "@/types/api";

function AttendanceView({ user }: { user: User }) {
  const admin = user.role === "admin";
  const [rows, setRows] = useState<Page<Attendance> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [serverToday, setServerToday] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [editedStatus, setEditedStatus] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmployee, setManualEmployee] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualStatus, setManualStatus] = useState("leave");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const path = admin ? "/admin/attendance" : "/attendance/me";
    api<Page<Attendance>>(
      `${path}${query({ start_date: start, end_date: end, status, department_id: admin ? department : "", employee_id: admin ? employee : "", search: admin ? search : "", page })}`,
    )
      .then(setRows)
      .catch((cause) => setError(cause.message));
  }, [admin, start, end, status, department, employee, search, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    api<{ timezone: string }>("/attendance/settings")
      .then((value) => setTimezone(value.timezone))
      .catch(() => {});
    api<{ date: string }>(admin ? "/admin/dashboard" : "/attendance/today")
      .then((value) => setServerToday(value.date))
      .catch(() => {});
    if (admin) {
      api<Department[]>("/departments")
        .then(setDepartments)
        .catch(() => {});
      api<Page<Employee>>("/employees?page_size=100")
        .then((value) => setEmployees(value.items))
        .catch(() => {});
    }
  }, [admin]);

  function preset(range: "today" | "week" | "month" | "all") {
    if (range === "all") {
      setStart("");
      setEnd("");
      setPage(1);
      return;
    }
    if (!serverToday) return;
    const current = new Date(`${serverToday}T12:00:00Z`);
    const first = new Date(current);
    if (range === "week") first.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7));
    if (range === "month") first.setUTCDate(1);
    setStart(range === "today" ? serverToday : first.toISOString().slice(0, 10));
    setEnd(serverToday);
    setPage(1);
  }

  async function saveStatus(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/admin/attendance/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: editedStatus }),
      });
      setEditing(null);
      setToast("Attendance status updated");
      void load();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function saveManual(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/admin/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(manualEmployee),
          attendance_date: manualDate,
          status: manualStatus,
        }),
      });
      setManualOpen(false);
      setToast("Attendance record created");
      void load();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not create attendance record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={admin ? "Team records" : "My records"}
        title="Attendance"
        description={
          admin
            ? "Search and review organization attendance."
            : "Review your check-in, check-out, and working hours."
        }
        action={
          admin && (
            <button
              className="btn-primary"
              onClick={() => {
                setManualDate(serverToday);
                setManualOpen(true);
              }}
            >
              Mark attendance
            </button>
          )
        }
      />
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {!admin && (
            <div className="flex flex-wrap gap-2">
              {(["today", "week", "month", "all"] as const).map((value) => (
                <button
                  key={value}
                  className="btn-secondary capitalize"
                  onClick={() => preset(value)}
                >
                  {value === "all"
                    ? "All time"
                    : value === "week"
                      ? "This week"
                      : value === "month"
                        ? "This month"
                        : "Today"}
                </button>
              ))}
            </div>
          )}
          <DateRangeFilter
            start={start}
            end={end}
            onStart={(value) => {
              setStart(value);
              setPage(1);
            }}
            onEnd={(value) => {
              setEnd(value);
              setPage(1);
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {admin && (
            <>
              <input
                className="input"
                placeholder="Search name or ID"
                aria-label="Search attendance"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="Department"
                className="input"
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All departments</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Employee"
                className="input"
                value={employee}
                onChange={(event) => {
                  setEmployee(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All employees</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <select
            aria-label="Attendance status"
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["present", "late", "half_day", "leave", "work_from_home", "absent"].map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="error-box mb-4">
          {error}
        </p>
      )}
      {!rows ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">Attendance records</h2>
            <span className="text-sm text-slate-500">{rows.total} records</span>
          </div>
          <AttendanceTable
            rows={rows.items}
            timezone={timezone}
            admin={admin}
            onEditStatus={
              admin
                ? (item) => {
                    setEditing(item);
                    setEditedStatus(item.status);
                  }
                : undefined
            }
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>
              Page {page} of {Math.max(1, Math.ceil(rows.total / rows.page_size))}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={page * rows.page_size >= rows.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveStatus}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Edit attendance status</h2>
            <p className="mt-1 text-sm text-slate-500">
              {editing.employee_name} · {editing.attendance_date}
            </p>
            <select
              className="input mt-5 w-full"
              value={editedStatus}
              onChange={(event) => setEditedStatus(event.target.value)}
              aria-label="New status"
            >
              {["present", "late", "half_day", "leave", "work_from_home", "absent"].map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveManual}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Mark attendance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a leave, absence, or remote-work record.
            </p>
            <label className="mt-5 block">
              <span className="label">Employee</span>
              <select
                className="input mt-1 w-full"
                value={manualEmployee}
                onChange={(event) => setManualEmployee(event.target.value)}
                required
              >
                <option value="">Select employee</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.employee_code})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="label">Date</span>
              <input
                className="input mt-1 w-full"
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="label">Status</span>
              <select
                className="input mt-1 w-full"
                value={manualStatus}
                onChange={(event) => setManualStatus(event.target.value)}
              >
                <option value="leave">Leave</option>
                <option value="absent">Absent</option>
                <option value="work_from_home">Work From Home</option>
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setManualOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                Create
              </button>
            </div>
          </form>
        </div>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default function AttendancePage() {
  return <AppShell>{(user) => <AttendanceView user={user} />}</AppShell>;
}
