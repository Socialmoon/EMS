import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

function validDateRange(str: string, minYear: number, maxYear: number) {
  const d = new Date(str);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= minYear && y <= maxYear;
}

const EmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional().refine((v) => !v || validDateRange(v, 1900, new Date().getFullYear()), {
    message: "Date of birth must be between 1900 and today",
  }),
  gender: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  departmentName: z.string().optional(),
  positionTitle: z.string().optional(),
  joinDate: z.string().optional().refine((v) => !v || validDateRange(v, 1900, new Date().getFullYear() + 1), {
    message: "Join date must be a valid date",
  }),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"]).optional(),
  salary: z.number().positive().max(10_000_000).optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/employees/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    if (!caller) return apiError("Unauthorized", { status: 401 });

    const { id } = await params;
    const doc = await adminDb.collection("employees").doc(id).get();
    if (!doc.exists) return apiError("Employee not found", { status: 404 });
    return apiSuccess({ id: doc.id, ...doc.data() });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to fetch employee");
  }
}

// PUT /api/employees/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const { id } = await params;
    const body = await request.json();
    const parsed = EmployeeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", { status: 400, details: parsed.error.flatten() });
    }
    await adminDb.collection("employees").doc(id).update({ ...parsed.data, updatedAt: new Date().toISOString() });
    return apiSuccess({ message: "Updated" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to update employee");
  }
}

// DELETE /api/employees/[id] — soft deactivate
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!adminDb) return apiError("Admin SDK not configured", { status: 503 });
    const caller = await verifySession(request);
    requireRole(caller, "admin", "hr");

    const { id } = await params;
    await adminDb.collection("employees").doc(id).update({ status: "inactive", updatedAt: new Date().toISOString() });
    return apiSuccess({ message: "Employee deactivated" });
  } catch (err) {
    if (err instanceof Response) return err;
    return apiError("Failed to deactivate employee");
  }
}
