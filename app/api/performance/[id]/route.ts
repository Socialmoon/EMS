import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const UpdateSchema = z.object({
  selfAssessment: z.string().optional(),
  managerReview: z.string().optional(),
  goals: z.array(z.object({ title: z.string(), progress: z.number().min(0).max(100) })).optional(),
  ratings: z.record(z.string(), z.number().min(1).max(5)).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  status: z.enum(["in-progress", "submitted", "completed"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const doc = await adminDb.collection("reviews").doc(id).get();
    if (!doc.exists) return apiError("Review not found", { status: 404 });
    const data = doc.data()!;
    if (caller.role === "employee" && data.employeeId !== caller.uid) return apiError("Forbidden", { status: 403 });
    return apiSuccess({ id: doc.id, ...data });
  } catch {
    return apiError("Failed to fetch review");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("reviews").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return apiError("Review not found", { status: 404 });
    await ref.update({ ...parsed.data, updatedAt: new Date().toISOString() });
    return apiSuccess({ id, ...doc.data(), ...parsed.data });
  } catch {
    return apiError("Failed to update review");
  }
}
