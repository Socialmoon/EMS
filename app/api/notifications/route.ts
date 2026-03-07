import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", caller.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch {
    return apiError("Failed to fetch notifications");
  }
}
