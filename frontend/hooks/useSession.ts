"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import type { User } from "@/types/api";

export function useSession() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<User>("/auth/me")
      .then((value) => {
        if (active) setUser(value);
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/session/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return { user, loading, logout };
}
