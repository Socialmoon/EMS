import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const PayrollSchema = z.object({
  employeeId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  basicSalary: z.number().positive(),
  allowances: z.array(z.object({ label: z.string(), amount: z.number() })).default([]),
  deductions: z.array(z.object({ label: z.string(), amount: z.number() })).default([]),
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    let q = adminDb.collection("payroll").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (caller.role === "employee") q = q.where("employeeId", "==", caller.uid);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    if (month) q = q.where("month", "==", month);

    const snap = await q.get();
    return apiSuccess(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch payroll");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const parsed = PayrollSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });

    const { basicSalary, allowances, deductions } = parsed.data;
    const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const grossPay = basicSalary + totalAllowances;
    const netPay = grossPay - totalDeductions;

    const ref = adminDb.collection("payroll").doc();
    const data = {
      ...parsed.data,
      grossPay, totalDeductions, netPay,
      status: "draft",
      generatedBy: caller!.uid,
      createdAt: new Date().toISOString(),
    };
    await ref.set(data);
    return apiSuccess({ id: ref.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create payroll");
  }
}
