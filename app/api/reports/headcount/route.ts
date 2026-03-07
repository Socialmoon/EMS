import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const [empSnap, deptSnap] = await Promise.all([
      adminDb.collection("employees").get(),
      adminDb.collection("departments").get(),
    ]);
    const employees = empSnap.docs.map((d) => d.data());
    const byDept: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const emp of employees) {
      const dept = (emp.departmentId as string) || "unassigned";
      byDept[dept] = (byDept[dept] || 0) + 1;
      const status = (emp.status as string) || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    const deptMap: Record<string, string> = {};
    for (const d of deptSnap.docs) deptMap[d.id] = (d.data().name as string) || d.id;
    const byDeptNamed: Record<string, number> = {};
    for (const [id, count] of Object.entries(byDept)) byDeptNamed[deptMap[id] || id] = count;
    return apiSuccess({ total: employees.length, byDepartment: byDeptNamed, byStatus });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to generate headcount report");
  }
}
