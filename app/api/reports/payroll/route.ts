import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const snap = await adminDb.collection("payroll").where("month", "==", month).get();
    const records = snap.docs.map((d) => d.data());
    let totalGross = 0, totalNet = 0, totalDeductions = 0;
    const byStatus: Record<string, number> = {};
    for (const r of records) {
      totalGross += (r.grossPay as number) || 0;
      totalNet += (r.netPay as number) || 0;
      totalDeductions += (r.totalDeductions as number) || 0;
      const status = (r.status as string) || "draft";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    return apiSuccess({ month, totalGross, totalNet, totalDeductions, count: records.length, byStatus });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to generate payroll report");
  }
}
