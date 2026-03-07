import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const { id } = await params;
    const doc = await adminDb.collection("payroll").doc(id).get();
    if (!doc.exists) return apiError("Not found", { status: 404 });
    const data = doc.data()!;
    if (caller.role === "employee" && data.employeeId !== caller.uid)
      return apiError("Forbidden", { status: 403 });
    return apiSuccess({ id: doc.id, ...data });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch payslip");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const { id } = await params;
    await adminDb.collection("payroll").doc(id).update({ status: "finalized", finalizedAt: new Date().toISOString() });
    return apiSuccess({ message: "Payroll finalized" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to finalize payroll");
  }
}
