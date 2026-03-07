import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const ref = adminDb.collection("notifications").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return apiError("Notification not found", { status: 404 });
    if (doc.data()!.userId !== caller.uid) return apiError("Forbidden", { status: 403 });
    await ref.update({ read: true, readAt: new Date().toISOString() });
    return apiSuccess({ id, read: true });
  } catch {
    return apiError("Failed to mark notification as read");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const ref = adminDb.collection("notifications").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return apiError("Notification not found", { status: 404 });
    if (doc.data()!.userId !== caller.uid) return apiError("Forbidden", { status: 403 });
    await ref.delete();
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Failed to delete notification");
  }
}
