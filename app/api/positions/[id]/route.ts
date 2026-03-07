import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const { id } = await params;
    await adminDb.collection("positions").doc(id).update(await request.json());
    return apiSuccess({ message: "Updated" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to update position");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const { id } = await params;
    await adminDb.collection("positions").doc(id).delete();
    return apiSuccess({ message: "Deleted" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to delete position");
  }
}
