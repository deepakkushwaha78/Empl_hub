"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ConfirmationDialog,
  EmployeeTable,
  LoadingSpinner,
  PageHeading,
  Toast,
} from "@/components/ui";
import { api, query } from "@/services/api";
import type { Department, Employee, Page } from "@/types/api";

type FormData = {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  department_id: string;
  designation: string;
  joining_date: string;
  manager_id: string;
  role: "employee" | "admin";
};
const emptyForm: FormData = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  department_id: "",
  designation: "",
  joining_date: "",
  manager_id: "",
  role: "employee",
};

function EmployeeForm({
  employee,
  departments,
  employees,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  departments: Department[];
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    employee
      ? {
          employee_code: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          password: "",
          phone: employee.phone ?? "",
          department_id: String(employee.department_id ?? ""),
          designation: employee.designation,
          joining_date: employee.joining_date,
          manager_id: String(employee.manager_id ?? ""),
          role: employee.role,
        }
      : emptyForm,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(key: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload: Record<string, string | number | null> = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      designation: form.designation,
      joining_date: form.joining_date,
      department_id: form.department_id ? Number(form.department_id) : null,
      manager_id: form.manager_id ? Number(form.manager_id) : null,
    };
    if (!employee) {
      payload.employee_code = form.employee_code;
      payload.password = form.password;
      payload.role = form.role;
    }
    try {
      await api(employee ? `/employees/${employee.id}` : "/employees", {
        method: employee ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save employee");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-8"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={employee ? "Edit employee" : "Add employee"}
        className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Employee details</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {employee ? "Edit employee" : "Add employee"}
            </h2>
          </div>
          <button aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          {!employee && (
            <label className="block">
              <span className="label">Employee ID</span>
              <input
                className="input mt-1 w-full"
                value={form.employee_code}
                onChange={(event) => update("employee_code", event.target.value)}
                required
                maxLength={32}
                placeholder="EMP004"
              />
            </label>
          )}
          <label className="block">
            <span className="label">First name</span>
            <input
              className="input mt-1 w-full"
              value={form.first_name}
              onChange={(event) => update("first_name", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Last name</span>
            <input
              className="input mt-1 w-full"
              value={form.last_name}
              onChange={(event) => update("last_name", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input
              className="input mt-1 w-full"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </label>
          {!employee && (
            <label className="block">
              <span className="label">Temporary password</span>
              <input
                className="input mt-1 w-full"
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
          )}
          <label className="block">
            <span className="label">Phone</span>
            <input
              className="input mt-1 w-full"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Department</span>
            <select
              className="input mt-1 w-full"
              value={form.department_id}
              onChange={(event) => update("department_id", event.target.value)}
            >
              <option value="">Unassigned</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Designation</span>
            <input
              className="input mt-1 w-full"
              value={form.designation}
              onChange={(event) => update("designation", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Joining date</span>
            <input
              className="input mt-1 w-full"
              type="date"
              value={form.joining_date}
              onChange={(event) => update("joining_date", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Manager</span>
            <select
              className="input mt-1 w-full"
              value={form.manager_id}
              onChange={(event) => update("manager_id", event.target.value)}
            >
              <option value="">None</option>
              {employees
                .filter((item) => item.id !== employee?.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          {!employee && (
            <label className="block">
              <span className="label">Role</span>
              <select
                className="input mt-1 w-full"
                value={form.role}
                onChange={(event) => update("role", event.target.value)}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}
          {error && (
            <p role="alert" className="error-box sm:col-span-2">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : employee ? "Save changes" : "Create employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeesView() {
  const [rows, setRows] = useState<Page<Employee> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Employee | null | "new">(null);
  const [toggling, setToggling] = useState<Employee | null>(null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<Page<Employee>>(`/employees${query({ search, department_id: department, active, page })}`)
        .then(setRows)
        .catch((cause) => setError(cause.message)),
    [search, department, active, page],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    api<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => {});
  }, []);
  async function toggle() {
    if (!toggling) return;
    setBusy(true);
    try {
      await api(`/employees/${toggling.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !toggling.is_active }),
      });
      setToast(`Employee ${toggling.is_active ? "deactivated" : "activated"}`);
      setToggling(null);
      void load();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }
  async function addDepartment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const item = await api<Department>("/departments", {
        method: "POST",
        body: JSON.stringify({ name: departmentName }),
      });
      setDepartments((items) => [...items, item].sort((a, b) => a.name.localeCompare(b.name)));
      setDepartmentOpen(false);
      setDepartmentName("");
      setToast("Department created");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not create department");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="People directory"
        title="Employees"
        description="Manage employee details, departments, and access."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setDepartmentOpen(true)}>
              Add department
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setEditing("new")}
            >
              <Plus size={17} /> Add employee
            </button>
          </div>
        }
      />
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search employees"
            aria-label="Search employees"
          />
        </div>
        <select
          className="input"
          value={department}
          onChange={(event) => {
            setDepartment(event.target.value);
            setPage(1);
          }}
          aria-label="Filter department"
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
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
          aria-label="Filter status"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {error && (
        <p className="error-box mb-4" role="alert">
          {error}
        </p>
      )}
      {!rows ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">Team members</h2>
            <span className="text-sm text-slate-500">{rows.total} employees</span>
          </div>
          <EmployeeTable rows={rows.items} onEdit={setEditing} onToggle={setToggling} />
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
        <EmployeeForm
          employee={editing === "new" ? null : editing}
          departments={departments}
          employees={rows?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setToast("Employee saved");
            void load();
          }}
        />
      )}
      {toggling && (
        <ConfirmationDialog
          title={toggling.is_active ? "Deactivate employee?" : "Activate employee?"}
          description={`${toggling.name} ${toggling.is_active ? "will lose access immediately" : "will regain access"}.`}
          confirmLabel={toggling.is_active ? "Deactivate" : "Activate"}
          onConfirm={toggle}
          onCancel={() => setToggling(null)}
          busy={busy}
        />
      )}
      {departmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={addDepartment}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Add department</h2>
            <input
              className="input mt-4 w-full"
              placeholder="Department name"
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              required
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDepartmentOpen(false)}
              >
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

export default function EmployeesPage() {
  return <AppShell adminOnly>{() => <EmployeesView />}</AppShell>;
}
