import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const SetRoleSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["admin", "hr", "manager", "employee"]),
});

// PUT /api/auth/set-role — Admin only
export async function PUT(request: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return apiError("Admin SDK not configured", { status: 503 });
    }

    const caller = await verifySession(request);
    requireRole(caller, "admin");

    const body = await request.json();
    const parsed = SetRoleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    }

    const { uid, role } = parsed.data;

    await adminAuth.setCustomUserClaims(uid, { role });
    await adminDb.collection("users").doc(uid).update({ role });

    return apiSuccess({ message: "Role updated" });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Set role error:", err);
    return apiError("Failed to set role");
  }
}
