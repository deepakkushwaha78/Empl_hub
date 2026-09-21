import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/services/origin";

const backend = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Invalid origin" }, { status: 403 });
  }
  const body = await request.text();
  const response = await fetch(`${backend}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }
  const result = NextResponse.json({ user: data.user });
  result.cookies.set("employee_session", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return result;
}
