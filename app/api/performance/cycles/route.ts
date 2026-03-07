import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const CycleSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  period: z.enum(["q1", "q2", "q3", "q4", "annual"]),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const snap = await adminDb.collection("reviewCycles").orderBy("year", "desc").get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch {
    return apiError("Failed to fetch review cycles");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const parsed = CycleSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("reviewCycles").doc();
    const data = { ...parsed.data, createdAt: new Date().toISOString(), createdBy: caller!.uid };
    await ref.set(data);
    return apiSuccess({ id: ref.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create review cycle");
  }
}
