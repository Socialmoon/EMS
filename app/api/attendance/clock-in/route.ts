import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

// POST /api/attendance/clock-in
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const today = new Date().toISOString().split("T")[0];
    const existing = await adminDb.collection("attendance")
      .where("employeeId", "==", caller.uid)
      .where("date", "==", today)
      .get();

    if (!existing.empty) return apiError("Already clocked in today", { status: 409 });

    const clockIn = new Date().toISOString();
    const ref = adminDb.collection("attendance").doc();
    await ref.set({ employeeId: caller.uid, date: today, clockIn, clockOut: null, workingHours: 0, status: "present", enteredBy: caller.uid });
    return apiSuccess({ id: ref.id, clockIn }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to clock in");
  }
}
