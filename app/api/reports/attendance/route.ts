import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr", "manager");
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const snap = await adminDb.collection("attendance").where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).get();
    const records = snap.docs.map((d) => d.data());
    const byEmployee: Record<string, { present: number; absent: number; late: number; totalHours: number }> = {};
    for (const r of records) {
      const id = r.employeeId as string;
      if (!byEmployee[id]) byEmployee[id] = { present: 0, absent: 0, late: 0, totalHours: 0 };
      if (r.status === "present") byEmployee[id].present++;
      else if (r.status === "absent") byEmployee[id].absent++;
      else if (r.status === "late") byEmployee[id].late++;
      byEmployee[id].totalHours += (r.workingHours as number) || 0;
    }
    return apiSuccess({ month, summary: byEmployee, totalRecords: records.length });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to generate attendance report");
  }
}
