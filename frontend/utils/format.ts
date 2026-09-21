import type { AttendanceStatus } from "@/types/api";

export function formatDate(value: string, timezone = "Asia/Kolkata"): string {
  const date = value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: timezone }).format(date);
}

export function formatTime(value: string | null, timezone = "Asia/Kolkata"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function formatMinutes(value: number | null): string {
  if (value === null) return "—";
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
}

export function statusLabel(status: AttendanceStatus): string {
  return {
    present: "Present",
    absent: "Absent",
    late: "Late",
    half_day: "Half Day",
    leave: "Leave",
    work_from_home: "Work From Home",
  }[status];
}
