import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const LeaveSchema = z.object({
  leaveType: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
});

// GET /api/leave
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    let q = adminDb.collection("leaves").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (caller.role === "employee") q = q.where("employeeId", "==", caller.uid);

    const snap = await q.get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

    const { startDate, endDate } = parsed.data;
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
    ) + 1;

    const ref = adminDb.collection("leaves").doc();
    await ref.set({
      ...parsed.data,
      employeeId: caller.uid,
      totalDays: days,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return apiSuccess({ id: ref.id }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to apply for leave");
  }
}
