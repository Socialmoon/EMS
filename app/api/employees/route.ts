import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

const EmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  department: z.string().min(1),
  position: z.string().min(1),
  hireDate: z.string().min(1),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"]),
  salary: z.number().positive(),
  managerId: z.string().optional(),
  emergencyContact: z.object({ name: z.string(), phone: z.string(), relation: z.string() }).optional(),
});

// GET /api/employees — list all employees
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const dept = searchParams.get("department");
    const status = searchParams.get("status");

    let query = adminDb.collection("employees").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (dept) query = query.where("department", "==", dept);
    if (status) query = query.where("status", "==", status);

    const snap = await query.get();
    const employees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return apiSuccess(employees);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch employees");
  }
}

// POST /api/employees — create employee (admin/hr only)
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const body = await request.json();
    const parsed = EmployeeSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });

    // Auto-generate employee ID
    const countSnap = await adminDb.collection("employees").count().get();
    const count = countSnap.data().count + 1;
    const employeeId = `EMP-${String(count).padStart(4, "0")}`;

    const docRef = adminDb.collection("employees").doc();
    const data = {
      ...parsed.data,
      employeeId,
      status: "active",
      profilePhoto: "",
      createdBy: caller!.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(data);
    return apiSuccess({ id: docRef.id, ...data }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to create employee");
  }
}
