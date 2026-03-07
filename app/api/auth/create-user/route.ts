import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: z.enum(["admin", "hr", "manager", "employee"]),
});

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth || !adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin");
    const parsed = CreateUserSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    const { email, password, displayName, role } = parsed.data;
    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid, email, displayName, role, createdAt: new Date().toISOString(),
    });
    return apiSuccess({ uid: userRecord.uid, email, displayName, role }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create user");
  }
}
