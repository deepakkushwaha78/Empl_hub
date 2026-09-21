import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/services/origin";

const backend = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json({ detail: "Invalid origin" }, { status: 403 });
  }
  const token = (await cookies()).get("employee_session")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const { path } = await context.params;
  const target = `${backend}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = request.method === "GET" ? undefined : await request.text();
  const response = await fetch(target, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body
        ? { "Content-Type": request.headers.get("content-type") ?? "application/json" }
        : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });
  const content = await response.text();
  return new NextResponse(content, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
