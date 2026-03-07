import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  pinned: z.boolean().optional(),
  category: z.enum(["general", "hr", "event", "urgent"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const doc = await adminDb.collection("announcements").doc(id).get();
    if (!doc.exists) return apiError("Announcement not found", { status: 404 });
    return apiSuccess({ id: doc.id, ...doc.data() });
  } catch {
    return apiError("Failed to fetch announcement");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("announcements").doc(id);
    if (!(await ref.get()).exists) return apiError("Announcement not found", { status: 404 });
    await ref.update({ ...parsed.data, updatedAt: new Date().toISOString() });
    return apiSuccess({ id });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to update announcement");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const ref = adminDb.collection("announcements").doc(id);
    if (!(await ref.get()).exists) return apiError("Announcement not found", { status: 404 });
    await ref.delete();
    return apiSuccess({ deleted: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to delete announcement");
  }
}
