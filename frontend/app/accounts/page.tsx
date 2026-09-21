"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ConfirmationDialog,
  LoadingSpinner,
  PageHeading,
  StatusBadge,
  Toast,
} from "@/components/ui";
import { api, query } from "@/services/api";
import type { Page, User } from "@/types/api";

function AccountsView({ currentUser }: { currentUser: User }) {
  const [accounts, setAccounts] = useState<Page<User> | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toggling, setToggling] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Page<User>>(`/auth/users${query({ search, role, active, page })}`)
      .then((value) => {
        setAccounts(value);
        setError("");
      })
      .catch((cause) => setError(cause.message));
  }, [search, role, active, page]);
  useEffect(() => {
    void load();
  }, [load]);

  async function createAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/auth/admins", { method: "POST", body: JSON.stringify({ email, password }) });
      setCreating(false);
      setEmail("");
      setPassword("");
      setToast("Admin account created");
      void load();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    if (!toggling) return;
    setBusy(true);
    try {
      await api(`/auth/users/${toggling.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !toggling.is_active }),
      });
      setToast(`Account ${toggling.is_active ? "deactivated" : "activated"}`);
      setToggling(null);
      void load();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Access management"
        title="Accounts"
        description="Review users and manage admin access."
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setCreating(true)}>
            <Plus size={17} /> Create admin
          </button>
        }
      />
      <div className="card mb-5 flex flex-wrap gap-3 p-5">
        <input
          className="input"
          placeholder="Search email"
          aria-label="Search email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          aria-label="Role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
        <select
          className="input"
          aria-label="Status"
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
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
      {!accounts ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">User accounts</h2>
            <span className="text-sm text-slate-500">{accounts.total} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="block text-xs text-slate-500">{item.email}</span>
                    </td>
                    <td className="capitalize">{item.role}</td>
                    <td>
                      <StatusBadge status={item.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <button
                        className="text-sm font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                        disabled={item.id === currentUser.id}
                        onClick={() => setToggling(item)}
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>
              Page {page} of {Math.max(1, Math.ceil(accounts.total / accounts.page_size))}
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
                disabled={page * accounts.page_size >= accounts.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={createAdmin}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Create admin account</h2>
            <label className="mt-5 block">
              <span className="label">Email</span>
              <input
                className="input mt-1 w-full"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="label">Password</span>
              <input
                className="input mt-1 w-full"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                Create
              </button>
            </div>
          </form>
        </div>
      )}
      {toggling && (
        <ConfirmationDialog
          title={toggling.is_active ? "Deactivate account?" : "Activate account?"}
          description={`${toggling.email} ${toggling.is_active ? "will lose access immediately" : "will regain access"}.`}
          confirmLabel={toggling.is_active ? "Deactivate" : "Activate"}
          onConfirm={toggle}
          onCancel={() => setToggling(null)}
          busy={busy}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default function AccountsPage() {
  return <AppShell adminOnly>{(user) => <AccountsView currentUser={user} />}</AppShell>;
}
