import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const LeaveSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  // HR/admin can pass these to grant on behalf of an employee
  employeeId: z.string().optional(),
  employeeCode: z.string().optional(),
  employeeName: z.string().optional(),
});

// GET /api/leave
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetEmployeeId = searchParams.get("employeeId");
    const statusFilter = searchParams.get("status");
    const isPrivileged = caller.role === "admin" || caller.role === "hr" || caller.role === "manager";

    // Determine which employee's leaves to fetch
    let filterById: string | null = null;
    if (caller.role === "employee") {
      filterById = caller.uid; // employees only see their own
    } else if (targetEmployeeId && isPrivileged) {
      filterById = targetEmployeeId; // HR/admin can query by specific employee
    }
    // If isPrivileged and no targetEmployeeId: fetch all (for the leave tab)

    let q: FirebaseFirestore.Query = adminDb.collection("leaves");
    if (filterById) q = q.where("employeeId", "==", filterById);
    if (statusFilter && (isPrivileged || caller.role === "employee")) {
      q = q.where("status", "==", statusFilter);
    }

    const snap = await q.get();
    let leaves = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .sort((a, b) => {
        const aDate = (a.createdAt as string) ?? "";
        const bDate = (b.createdAt as string) ?? "";
        return bDate.localeCompare(aDate);
      });

    // For privileged users: resolve missing employeeCode/employeeName from employees collection
    if (isPrivileged) {
      const missingIds = [
        ...new Set(
          leaves
            .filter((l) => !l.employeeCode && typeof l.employeeId === "string")
            .map((l) => l.employeeId as string)
        ),
      ];
      if (missingIds.length > 0) {
        // Fetch in batches of 30 (Firestore "in" limit)
        const empMap: Record<string, { employeeId: string; name: string }> = {};
        for (let i = 0; i < missingIds.length; i += 30) {
          const batch = missingIds.slice(i, i + 30);
          const empSnap = await adminDb
            .collection("employees")
            .where("__name__", "in", batch)
            .get();
          empSnap.docs.forEach((d) => {
            const data = d.data();
            empMap[d.id] = {
              employeeId: data.employeeId ?? "",
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
            };
          });
        }
        leaves = leaves.map((l) => {
          if (!l.employeeCode && typeof l.employeeId === "string" && empMap[l.employeeId]) {
            return {
              ...l,
              employeeCode: empMap[l.employeeId].employeeId,
              employeeName: (l.employeeName as string) || empMap[l.employeeId].name,
            };
          }
          return l;
        });
      }
    }

    return apiSuccess(leaves);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch leaves");
  }
}

// POST /api/leave — apply
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const parsed = LeaveSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });

    const { startDate, endDate, leaveType, reason, employeeId: targetId, employeeCode, employeeName } = parsed.data;
    const isPrivileged = caller.role === "admin" || caller.role === "hr";

    // Determine which employee this leave is for
    const resolvedEmployeeId = isPrivileged && targetId ? targetId : caller.uid;

    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
    ) + 1;

    if (days < 1) return apiError("End date must be on or after start date", { status: 400 });

    const ref = adminDb.collection("leaves").doc();
    await ref.set({
      leaveType,
      startDate,
      endDate,
      reason,
      employeeId: resolvedEmployeeId,
      ...(employeeCode ? { employeeCode } : {}),
      ...(employeeName ? { employeeName } : {}),
      totalDays: days,
      // HR/admin granting leave is immediately approved
      status: isPrivileged && targetId ? "approved" : "pending",
      ...(isPrivileged && targetId
        ? { approvedBy: caller.uid, approvalDate: new Date().toISOString(), grantedByHR: true }
        : {}),
      createdAt: new Date().toISOString(),
    });
    return apiSuccess({ id: ref.id }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to apply for leave");
  }
}
