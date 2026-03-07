import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const AnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(["general", "hr", "event", "urgent"]).default("general"),
  targetRoles: z.array(z.enum(["admin", "hr", "manager", "employee"])).default(["admin", "hr", "manager", "employee"]),
  pinned: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const snap = await adminDb.collection("announcements").orderBy("createdAt", "desc").limit(50).get();
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((d) => Array.isArray(d.targetRoles) ? (d.targetRoles as string[]).includes(caller.role) : true);
    return apiSuccess(docs);
  } catch {
    return apiError("Failed to fetch announcements");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");
    const parsed = AnnouncementSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const ref = adminDb.collection("announcements").doc();
    const data = { ...parsed.data, authorId: caller!.uid, createdAt: new Date().toISOString() };
    await ref.set(data);
    return apiSuccess({ id: ref.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create announcement");
  }
}
