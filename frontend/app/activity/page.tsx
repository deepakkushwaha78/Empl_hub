"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingSpinner, PageHeading } from "@/components/ui";
import { api, query } from "@/services/api";
import type { AuditEntry, Page } from "@/types/api";

function ActivityView() {
  const [entries, setEntries] = useState<Page<AuditEntry> | null>(null);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ timezone: string }>("/attendance/settings")
      .then((value) => setTimezone(value.timezone))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    api<Page<AuditEntry>>(`/admin/audit-logs${query({ action, user_id: userId, page })}`)
      .then((value) => {
        if (active) {
          setEntries(value);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [action, userId, page]);

  return (
    <>
      <PageHeading
        eyebrow="Audit trail"
        title="Activity"
        description="Account access, employee changes, and attendance actions."
      />
      <div className="card mb-5 flex flex-wrap gap-3 p-5">
        <select
          className="input"
          aria-label="Filter action"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          <option value="auth.login_success">Successful login</option>
          <option value="auth.login_failed">Failed login</option>
          <option value="auth.logout">Logout</option>
          <option value="employee.checked_in">Check in</option>
          <option value="employee.checked_out">Check out</option>
          <option value="employee.created">Employee created</option>
          <option value="employee.updated">Employee updated</option>
          <option value="employee.deactivated">Employee deactivated</option>
          <option value="attendance.updated">Attendance updated</option>
        </select>
        <input
          className="input"
          type="number"
          min={1}
          placeholder="User ID"
          aria-label="Filter user ID"
          value={userId}
          onChange={(event) => {
            setUserId(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {error && (
        <p className="error-box mb-4" role="alert">
          {error}
        </p>
      )}
      {!entries ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">Event log</h2>
            <span className="text-sm text-slate-500">{entries.total} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP address</th>
                </tr>
              </thead>
              <tbody>
                {entries.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: timezone,
                      }).format(new Date(item.occurred_at))}
                    </td>
                    <td>{item.actor_email ?? "Unknown"}</td>
                    <td className="font-medium text-slate-800">
                      {item.action.replaceAll(".", " · ").replaceAll("_", " ")}
                    </td>
                    <td>
                      {item.resource_type ? `${item.resource_type} ${item.resource_id ?? ""}` : "—"}
                    </td>
                    <td>{item.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.items.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">No activity found.</p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>
              Page {page} of {Math.max(1, Math.ceil(entries.total / entries.page_size))}
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
                disabled={page * entries.page_size >= entries.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ActivityPage() {
  return <AppShell adminOnly>{() => <ActivityView />}</AppShell>;
}
