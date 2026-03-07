import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

// GET /api/employees/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const { id } = await params;
    const doc = await adminDb.collection("employees").doc(id).get();
    if (!doc.exists) return apiError("Employee not found", { status: 404 });
    return apiSuccess({ id: doc.id, ...doc.data() });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch employee");
  }
}

// PUT /api/employees/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const { id } = await params;
    const body = await request.json();
    await adminDb.collection("employees").doc(id).update({ ...body, updatedAt: new Date().toISOString() });
    return apiSuccess({ message: "Updated" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to update employee");
  }
}

// DELETE /api/employees/[id] — soft deactivate
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const { id } = await params;
    await adminDb.collection("employees").doc(id).update({ status: "inactive", updatedAt: new Date().toISOString() });
    return apiSuccess({ message: "Employee deactivated" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to deactivate employee");
  }
}
