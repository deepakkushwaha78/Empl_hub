"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Sign in failed");
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#173b4d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">
            E
          </div>
          <span className="text-lg font-semibold">Employee Hub</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <Clock3 size={30} />
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Every workday, clearly accounted for.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-teal-100/80">
            A simple place to manage your team, track attendance, and understand the hours behind
            the work.
          </p>
        </div>
        <p className="relative z-10 text-sm text-teal-100/60">Employee management and attendance</p>
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full border-[70px] border-white/5" />
        <div className="pointer-events-none absolute right-10 top-28 h-52 w-52 rounded-full border-[45px] border-white/5" />
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-bold text-white">
              E
            </div>
            <span className="font-semibold">Employee Hub</span>
          </div>
          <span className="eyebrow">Welcome back</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
            Sign in to your account
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your work email and password to continue.
          </p>
          <form className="mt-9 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="label">Email address</span>
              <div className="relative mt-2">
                <Mail size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  className="input w-full pl-10"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="label">Password</span>
              <div className="relative mt-2">
                <LockKeyhole size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  className="input w-full pl-10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              className="btn-primary flex w-full items-center justify-center gap-2 py-3"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400">
            Your session is secured with an expiring access token.
          </p>
        </div>
      </section>
    </main>
  );
}
