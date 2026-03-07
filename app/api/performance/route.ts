import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const ReviewSchema = z.object({
  employeeId: z.string().min(1),
  cycleId: z.string().optional(),
  reviewType: z.enum(["q1", "q2", "q3", "q4", "annual"]),
  goals: z.array(z.object({ title: z.string(), progress: z.number().min(0).max(100) })).default([]),
  selfAssessment: z.string().optional(),
  managerReview: z.string().optional(),
  ratings: z.record(z.string(), z.number().min(1).max(5)).default({}),
  overallRating: z.number().min(1).max(5).optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    let q = adminDb.collection("reviews").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (caller.role === "employee") q = q.where("employeeId", "==", caller.uid);
    const snap = await q.get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch reviews");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const parsed = ReviewSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("reviews").doc();
    const data = { ...parsed.data, reviewerId: caller.uid, status: "in-progress", createdAt: new Date().toISOString() };
    await ref.set(data);
    return apiSuccess({ id: ref.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create review");
  }
}
