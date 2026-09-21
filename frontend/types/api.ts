export type Role = "admin" | "employee";
export type AttendanceStatus =
  "present" | "absent" | "late" | "half_day" | "leave" | "work_from_home";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  employee_id: number | null;
  is_active: boolean;
}

export interface Employee {
  id: number;
  employee_code: string;
  user_id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string | null;
  department_id: number | null;
  department: string | null;
  designation: string;
  joining_date: string;
  manager_id: number | null;
  employment_status: "active" | "inactive";
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_minutes: number | null;
  status: AttendanceStatus;
  is_late: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface Today {
  date: string;
  timezone: string;
  state: "not_checked_in" | "checked_in" | "checked_out";
  record: Attendance | null;
}
export interface EmployeeDashboard {
  today: Today;
  month: string;
  days_present: number;
  days_absent: number;
  days_late: number;
  leave_days: number;
  total_working_minutes: number;
}
export interface AdminDashboard {
  date: string;
  timezone: string;
  total_employees: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  currently_checked_in: number;
  total_departments: number;
  daily_trend: { date: string; present: number }[];
  monthly_trend: { month: string; present: number }[];
  department_attendance: { department: string; present: number }[];
  present_vs_absent: { present: number; absent: number };
}
export interface ReportRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  total_working_minutes: number;
  average_working_minutes: number;
}
export interface Report {
  start_date: string;
  end_date: string;
  timezone: string;
  rows: ReportRow[];
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  occurred_at: string;
}
