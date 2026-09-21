"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, LoadingSpinner, PageHeading } from "@/components/ui";
import { api, query } from "@/services/api";
import type { Department, Employee, Page, Report } from "@/types/api";
import { formatMinutes } from "@/utils/format";

function ReportsView() {
  const [period, setPeriod] = useState("monthly");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => {});
    api<Page<Employee>>("/employees?page_size=100")
      .then((value) => setEmployees(value.items))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    api<Report>(
      `/admin/reports${query({ period, start_date: start, end_date: end, department_id: department, employee_id: employee })}`,
    )
      .then((value) => {
        if (active) {
          setReport(value);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, start, end, department, employee]);

  function exportCsv() {
    if (!report) return;
    const headers = [
      "Employee ID",
      "Employee",
      "Department",
      "Present Days",
      "Absent Days",
      "Late Days",
      "Leave Days",
      "Total Working Minutes",
      "Average Working Minutes",
    ];
    const lines = [
      headers,
      ...report.rows.map((row) => [
        row.employee_code,
        row.employee_name,
        row.department ?? "",
        row.present_days,
        row.absent_days,
        row.late_days,
        row.leave_days,
        row.total_working_minutes,
        row.average_working_minutes,
      ]),
    ];
    const csv = lines
      .map((line) =>
        line
          .map((value) => {
            const text = String(value);
            const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${report.start_date}-${report.end_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeading
        eyebrow="Analysis"
        title="Attendance reports"
        description="Working hours and attendance by employee."
        action={
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={exportCsv}
            disabled={!report}
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-5">
        <label>
          <span className="label">Period</span>
          <select
            className="input mt-1 block"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setStart("");
              setEnd("");
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <DateRangeFilter
          start={start}
          end={end}
          onStart={(value) => {
            setStart(value);
            setPeriod("custom");
          }}
          onEnd={(value) => {
            setEnd(value);
            setPeriod("custom");
          }}
        />
        <select
          className="input"
          aria-label="Department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Employee"
          value={employee}
          onChange={(event) => setEmployee(event.target.value)}
        >
          <option value="">All employees</option>
          {employees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="error-box mb-4">
          {error}
        </p>
      )}
      {loading && !report ? (
        <LoadingSpinner />
      ) : (
        report && (
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">
                Report: {report.start_date} to {report.end_date}
              </h2>
              <p className="mt-1 text-xs text-slate-500">Timezone: {report.timezone}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Leave</th>
                    <th>Total hours</th>
                    <th>Average hours</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>
                        <span className="font-semibold text-slate-800">{row.employee_name}</span>
                        <span className="block text-xs text-slate-500">{row.employee_code}</span>
                      </td>
                      <td>{row.department ?? "—"}</td>
                      <td>{row.present_days}</td>
                      <td>{row.absent_days}</td>
                      <td>{row.late_days}</td>
                      <td>{row.leave_days}</td>
                      <td>{formatMinutes(row.total_working_minutes)}</td>
                      <td>{formatMinutes(row.average_working_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.rows.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  No employees match this report.
                </p>
              )}
            </div>
          </div>
        )
      )}
    </>
  );
}

export default function ReportsPage() {
  return <AppShell adminOnly>{() => <ReportsView />}</AppShell>;
}
