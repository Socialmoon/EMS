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
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const snap = await adminDb.collection("leaveRequests").get();
    const records = snap.docs.map((d) => d.data());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDays = 0;
    for (const r of records) {
      if (!((r.startDate as string)?.startsWith(year))) continue;
      const type = (r.leaveType as string) || "other";
      byType[type] = (byType[type] || 0) + 1;
      const status = (r.status as string) || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalDays += (r.totalDays as number) || 0;
    }
    return apiSuccess({ year, byType, byStatus, totalDays });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to generate leave report");
  }
}
