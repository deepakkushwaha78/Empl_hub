import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSameOrigin } from "@/services/origin";

const backend = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Invalid origin" }, { status: 403 });
  }
  const token = (await cookies()).get("employee_session")?.value;
  if (token) {
    try {
      await fetch(`${backend}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Clear the browser session even if the API is temporarily unavailable.
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("employee_session");
  return response;
}
