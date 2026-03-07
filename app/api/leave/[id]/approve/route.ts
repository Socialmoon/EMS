import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

// PUT /api/leave/[id]/approve
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr", "manager");
    const { id } = await params;
    const { remarks } = await request.json().catch(() => ({}));
    await adminDb.collection("leaves").doc(id).update({
      status: "approved",
      approvedBy: caller!.uid,
      approvalDate: new Date().toISOString(),
      ...(remarks ? { remarks } : {}),
    });
    return apiSuccess({ message: "Leave approved" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to approve leave");
  }
}
