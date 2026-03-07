import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

// GET /api/attendance?employeeId=&date=&month=
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") ?? (caller.role === "employee" ? caller.uid : null);
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // YYYY-MM

    let q = adminDb.collection("attendance") as FirebaseFirestore.Query;
    if (employeeId) q = q.where("employeeId", "==", employeeId);
    if (date) q = q.where("date", "==", date);
    if (month) {
      q = q.where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`);
    }
    q = q.orderBy("date", "desc");
    const snap = await q.get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch attendance");
  }
}

// POST /api/attendance — manual entry by HR/Admin
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const body = await request.json();
    const ref = adminDb.collection("attendance").doc();
    await ref.set({ ...body, enteredBy: caller!.uid, manualEntry: true });
    return apiSuccess({ id: ref.id }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to add attendance");
  }
}
