import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

// POST /api/attendance/clock-out
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const today = new Date().toISOString().split("T")[0];
    const snap = await adminDb.collection("attendance")
      .where("employeeId", "==", caller.uid)
      .where("date", "==", today)
      .get();

    if (snap.empty) return apiError("No clock-in found for today", { status: 404 });

    const doc = snap.docs[0];
    const { clockIn } = doc.data() as { clockIn: string };
    const clockOut = new Date().toISOString();
    const workingHours = parseFloat(
      ((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3_600_000).toFixed(2)
    );

    await doc.ref.update({ clockOut, workingHours });
    return apiSuccess({ clockOut, workingHours });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to clock out");
  }
}
