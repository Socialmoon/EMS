import { NextRequest } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const DocSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["contract", "id", "certificate", "resume", "other"]),
  employeeId: z.string().min(1),
  fileUrl: z.string().url(),
  filePath: z.string().min(1),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    let q = adminDb.collection("documents").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (caller.role === "employee") q = q.where("employeeId", "==", caller.uid);
    else if (employeeId) q = q.where("employeeId", "==", employeeId);
    const snap = await q.get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch {
    return apiError("Failed to fetch documents");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const parsed = DocSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    if (caller.role === "employee" && parsed.data.employeeId !== caller.uid) {
      return apiError("Cannot upload for another employee", { status: 403 });
    }
    const ref = adminDb.collection("documents").doc();
    const data = { ...parsed.data, uploadedBy: caller.uid, createdAt: new Date().toISOString() };
    await ref.set(data);
    return apiSuccess({ id: ref.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to save document");
  }
}
