import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const ManualAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
  workingHours: z.number().min(0).max(24).optional(),
  status: z.enum(["present", "absent", "late", "half-day"]).optional(),
});

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
    const parsed = ManualAttendanceSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("attendance").doc();
    await ref.set({ ...parsed.data, enteredBy: caller!.uid, manualEntry: true });
    return apiSuccess({ id: ref.id }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to add attendance");
  }
}
