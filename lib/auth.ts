import { NextRequest, NextResponse } from "next/server";

export function checkAuth(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-api-key");
  const secret = process.env.API_SECRET_KEY;

  // If no secret set, auth is disabled (safe for local dev)
  if (!secret) return null;

  if (!key || key !== secret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return null;
}
