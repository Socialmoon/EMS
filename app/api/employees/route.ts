import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin/admin";
import { verifySession, requireRole } from "@/lib/auth/verifySession";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";

// Validate a YYYY-MM-DD date string is within a sensible range
function validDateRange(str: string, minYear: number, maxYear: number) {
  const d = new Date(str);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= minYear && y <= maxYear;
}

const EmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine((v) => !v || validDateRange(v, 1900, new Date().getFullYear()), {
      message: "Date of birth must be between 1900 and today",
    }),
  gender: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  joinDate: z
    .string()
    .min(1, "Join date is required")
    .refine((v) => validDateRange(v, 1900, new Date().getFullYear() + 1), {
      message: "Join date must be a valid date (1900 – next year)",
    }),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"]).optional().default("full-time"),
  salary: z
    .number()
    .positive("Salary must be a positive number")
    .max(10_000_000, "Salary seems unrealistically high. Please enter a valid monthly salary.")
    .optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
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

    // "on-leave" is a computed status — not stored in Firestore.
    // Resolve it by finding employees with an approved leave covering today.
    if (status === "on-leave") {
      const todayStr = new Date().toISOString().slice(0, 10);
      const leavesSnap = await adminDb
        .collection("leaves")
        .where("status", "==", "approved")
        .get();

      const onLeaveIds = new Set<string>();
      leavesSnap.docs.forEach((d) => {
        const data = d.data();
        if (
          typeof data.startDate === "string" &&
          typeof data.endDate === "string" &&
          data.startDate <= todayStr &&
          data.endDate >= todayStr &&
          typeof data.employeeId === "string"
        ) {
          onLeaveIds.add(data.employeeId);
        }
      });

      if (onLeaveIds.size === 0) return apiSuccess([]);

      // Fetch employees in batches of 30 (Firestore "in" limit)
      const ids = [...onLeaveIds];
      const batches: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
      for (let i = 0; i < ids.length; i += 30) {
        batches.push(adminDb.collection("employees").where("__name__", "in", ids.slice(i, i + 30)).get());
      }
      const snaps = await Promise.all(batches);
      const employees = snaps
        .flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data(), status: "on-leave" } as Record<string, unknown>)))
        .sort((a, b) => {
          const aDate = typeof a.createdAt === "string" ? a.createdAt : "";
          const bDate = typeof b.createdAt === "string" ? b.createdAt : "";
          return bDate.localeCompare(aDate);
        });
      return apiSuccess(employees);
    }

    // Normal status filter (active / inactive)
    let query = adminDb.collection("employees") as FirebaseFirestore.Query;
    if (dept) query = query.where("department", "==", dept);
    if (status) query = query.where("status", "==", status);

    const snap = await query.get();
    const employees = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .sort((a, b) => {
        const aDate = typeof a.createdAt === "string" ? a.createdAt : "";
        const bDate = typeof b.createdAt === "string" ? b.createdAt : "";
        return bDate.localeCompare(aDate);
      });
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
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const FIELD_LABELS: Record<string, string> = {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        dateOfBirth: "Date of birth",
        joinDate: "Join date",
        salary: "Salary",
        departmentId: "Department",
        positionId: "Position",
        employmentType: "Employment type",
      };
      const messages = Object.entries(fieldErrors)
        .map(([field, errs]) => `${FIELD_LABELS[field] ?? field}: ${(errs ?? []).join(", ")}`)
        .join(" | ");
      return apiError(messages || "Invalid input", { status: 400, details: parsed.error.flatten() });
    }

    // Auto-generate employee ID
    const countSnap = await adminDb.collection("employees").count().get();
    const count = countSnap.data().count + 1;
    const employeeId = `EMP-${String(count).padStart(4, "0")}`;

    // Resolve department and position names so the list can display them
    let departmentName: string | undefined;
    let positionTitle: string | undefined;
    if (parsed.data.departmentId) {
      const dSnap = await adminDb.collection("departments").doc(parsed.data.departmentId).get();
      departmentName = (dSnap.data() as { name?: string } | undefined)?.name;
    }
    if (parsed.data.positionId) {
      const pSnap = await adminDb.collection("positions").doc(parsed.data.positionId).get();
      positionTitle = (pSnap.data() as { title?: string } | undefined)?.title;
    }

    const docRef = adminDb.collection("employees").doc();
    const data = {
      ...parsed.data,
      ...(departmentName && { departmentName }),
      ...(positionTitle && { positionTitle }),
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
