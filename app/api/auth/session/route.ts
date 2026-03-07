import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

// POST /api/auth/session — exchange ID token for a session cookie
export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return apiError("Admin SDK not configured — add service account credentials to .env.local", { status: 503 });
    }
    const { token } = await request.json();
    if (!token) return apiError("Missing token", { status: 400 });

    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: SESSION_DURATION_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });

    return apiSuccess({ message: "Session created" });
  } catch (err) {
    console.error("Session creation failed:", err);
    return apiError("Failed to create session", { status: 401 });
  }
}

// DELETE /api/auth/session — logout: clear the session cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set("__session", "", { maxAge: 0, path: "/" });
  return apiSuccess({ message: "Session cleared" });
}
