import { NextRequest } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const doc = await adminDb.collection("documents").doc(id).get();
    if (!doc.exists) return apiError("Document not found", { status: 404 });
    const data = doc.data()!;
    if (caller.role === "employee" && data.employeeId !== caller.uid) return apiError("Forbidden", { status: 403 });
    return apiSuccess({ id: doc.id, ...data });
  } catch {
    return apiError("Failed to fetch document");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const ref = adminDb.collection("documents").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return apiError("Document not found", { status: 404 });
    const data = doc.data()!;
    if (caller.role === "employee" && data.employeeId !== caller.uid) return apiError("Forbidden", { status: 403 });
    if (caller.role === "manager") return apiError("Managers cannot delete documents", { status: 403 });
    if (adminStorage && data.filePath) {
      try { await adminStorage.bucket().file(data.filePath).delete(); } catch { /* file may not exist */ }
    }
    await ref.delete();
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Failed to delete document");
  }
}
