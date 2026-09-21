"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { api } from "@/services/api";
import type { Today } from "@/types/api";
import { ConfirmationDialog, Toast } from "@/components/ui";

export function AttendanceActions({ today, onChanged }: { today: Today; onChanged: () => void }) {
  const [confirm, setConfirm] = useState<"in" | "out" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [workFromHome, setWorkFromHome] = useState(false);
  async function submit() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`/attendance/check-${confirm}`, {
        method: "POST",
        ...(confirm === "in" ? { body: JSON.stringify({ work_from_home: workFromHome }) } : {}),
      });
      setToast(confirm === "in" ? "Checked in successfully" : "Checked out successfully");
      setConfirm(null);
      onChanged();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Attendance action failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary flex items-center gap-2"
          disabled={today.state !== "not_checked_in"}
          onClick={() => setConfirm("in")}
        >
          <LogIn size={17} /> Check in
        </button>
        <button
          className="btn-secondary flex items-center gap-2"
          disabled={today.state !== "checked_in"}
          onClick={() => setConfirm("out")}
        >
          <LogOut size={17} /> Check out
        </button>
        {today.state === "not_checked_in" && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={workFromHome}
              onChange={(event) => setWorkFromHome(event.target.checked)}
            />{" "}
            Work from home
          </label>
        )}
      </div>
      {confirm && (
        <ConfirmationDialog
          title={confirm === "in" ? "Check in now?" : "Check out now?"}
          description="The server will record the current time for your attendance."
          confirmLabel={confirm === "in" ? "Check in" : "Check out"}
          onConfirm={submit}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
