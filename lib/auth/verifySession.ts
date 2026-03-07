import { adminAuth } from "@/lib/firebase-admin/admin";
import { NextRequest } from "next/server";

export type AuthenticatedUser = {
  uid: string;
  email: string;
  role: "admin" | "hr" | "manager" | "employee";
};

/**
 * Verifies the Firebase session cookie from the request.
 * Returns the decoded user or null if invalid / missing.
 */
export async function verifySession(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    if (!adminAuth) return null; // Admin SDK not initialized (missing credentials)
    const sessionCookie = request.cookies.get("__session")?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      role: (decoded.role as AuthenticatedUser["role"]) ?? "employee",
    };
  } catch {
    return null;
  }
}

/**
 * Throws a Response with 401/403 if the user is missing or lacks the required role.
 */
export function requireRole(
  user: AuthenticatedUser | null,
  ...allowedRoles: AuthenticatedUser["role"][]
): asserts user is AuthenticatedUser {
  if (!user) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowedRoles.includes(user.role)) {
    throw Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
