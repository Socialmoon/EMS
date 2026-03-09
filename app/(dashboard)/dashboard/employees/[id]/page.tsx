"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, X, Check, UserX, UserCheck, AlertCircle, CalendarPlus, Calendar, Eye } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

interface Employee {
  id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone?: string; departmentId?: string; departmentName?: string;
  positionId?: string; positionTitle?: string; status: string; joinDate: string;
  salary?: number; address?: string; gender?: string; dateOfBirth?: string;
  emergencyContact?: string; emergencyPhone?: string;
}
interface SelectOption { id: string; name?: string; title?: string; departmentId?: string; }
interface LeaveRecord {
  id: string; leaveType: string; startDate: string; endDate: string;
  totalDays: number; reason: string; status: string; createdAt: string;
  grantedByHR?: boolean; approvedBy?: string;
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THIS_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

function isValidDate(str: string): boolean {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 grid grid-cols-3 gap-2 items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function Display({ value }: { value: string | number | undefined | null }) {
  return <span className="text-sm text-gray-900">{value || "—"}</span>;
}

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Maternity", "Paternity", "Unpaid", "Other"];
const EMPTY_LEAVE = { leaveType: "", startDate: "", endDate: "", reason: "" };

// Allow retroactive grants up to 1 year back, and future grants up to 2 years ahead
const LEAVE_MIN_DATE = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);
const LEAVE_MAX_DATE = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10);
const LEAVE_MAX_DAYS = 365;

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [allPositions, setAllPositions] = useState<SelectOption[]>([]);
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ ...EMPTY_LEAVE });
  const [leaveError, setLeaveError] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState("");
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, dRes, pRes, lvRes] = await Promise.all([
          fetch(`/api/employees/${id}`),
          fetch("/api/departments"),
          fetch("/api/positions"),
          fetch(`/api/leave?employeeId=${id}`),
        ]);
        const [emp, d, p, lv] = await Promise.all([empRes.json(), dRes.json(), pRes.json(), lvRes.json()]);
        const depts: SelectOption[] = d.data || [];
        const positions: SelectOption[] = p.data || [];
        if (emp.data) {
          const empData = { ...emp.data };
          // Resolve display names from loaded lists in case they weren't stored
          if (!empData.departmentName && empData.departmentId)
            empData.departmentName = depts.find((x) => x.id === empData.departmentId)?.name || "";
          if (!empData.positionTitle && empData.positionId)
            empData.positionTitle = positions.find((x) => x.id === empData.positionId)?.title || "";
          setEmployee(empData);
          setForm(empData);
        }
        setDepartments(depts);
        setAllPositions(positions);
        setLeaveRecords(Array.isArray(lv.data) ? lv.data : []);
      } catch {
        // handled by empty state
      } finally {
        setLoading(false);
        setLeavesLoading(false);
      }
    };
    load();
  }, [id]);

  // Only show positions for the selected department; empty when no department chosen
  const filteredPositions = form.departmentId
    ? allPositions.filter((p) => p.departmentId === form.departmentId)
    : [];

  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (k === "departmentId") {
      setForm((prev) => ({ ...prev, departmentId: e.target.value, positionId: "" }));
    } else {
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
    }
  };

  function validateForm(): string | null {
    const errs: string[] = [];
    if (!(form.firstName || "").trim()) errs.push("First name is required.");
    if (!(form.lastName || "").trim()) errs.push("Last name is required.");
    if (!(form.email || "").trim()) errs.push("Email is required.");
    else if (!EMAIL_RE.test(form.email!)) errs.push("Email address is not valid.");
    if (form.dateOfBirth) {
      if (!isValidDate(form.dateOfBirth)) {
        errs.push("Date of birth is not valid.");
      } else {
        const yr = new Date(form.dateOfBirth).getFullYear();
        if (yr < 1900 || new Date(form.dateOfBirth) > new Date()) errs.push("Date of birth must be between 1900 and today.");
      }
    }
    if (!form.joinDate) {
      errs.push("Join date is required.");
    } else if (!isValidDate(form.joinDate)) {
      errs.push("Join date is not valid.");
    } else {
      const yr = new Date(form.joinDate).getFullYear();
      if (yr < 1900 || yr > THIS_YEAR + 1) errs.push(`Join date year must be between 1900 and ${THIS_YEAR + 1}.`);
    }
    const sal = Number(form.salary);
    if (form.salary !== undefined && form.salary !== null && String(form.salary) !== "") {
      if (isNaN(sal) || sal <= 0) errs.push("Salary must be a positive number.");
      else if (sal > 10_000_000) errs.push("Salary cannot exceed $10,000,000.");
    }
    return errs.length ? errs.join(" ") : null;
  }

  async function save() {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentName: departments.find((d) => d.id === form.departmentId)?.name ?? "",
          positionTitle: allPositions.find((p) => p.id === form.positionId)?.title ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Update failed"); return; }
      // Resolve display names for the saved IDs
      const deptName = departments.find((d) => d.id === form.departmentId)?.name ?? "";
      const posTitle = allPositions.find((p) => p.id === form.positionId)?.title ?? "";
      setEmployee((prev) => ({ ...prev!, ...form, departmentName: deptName, positionTitle: posTitle }));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function grantLeave() {
    setLeaveError("");
    if (!leaveForm.leaveType) { setLeaveError("Please select a leave type."); return; }

    // Validate start date
    if (!leaveForm.startDate) { setLeaveError("Start date is required."); return; }
    if (!isValidDate(leaveForm.startDate)) { setLeaveError("Start date is not a valid date."); return; }
    if (leaveForm.startDate < LEAVE_MIN_DATE) {
      setLeaveError(`Start date cannot be more than 1 year in the past (earliest: ${LEAVE_MIN_DATE}).`); return;
    }
    if (leaveForm.startDate > LEAVE_MAX_DATE) {
      setLeaveError(`Start date cannot be more than 2 years in the future.`); return;
    }

    // Validate end date
    if (!leaveForm.endDate) { setLeaveError("End date is required."); return; }
    if (!isValidDate(leaveForm.endDate)) { setLeaveError("End date is not a valid date."); return; }
    if (leaveForm.endDate < leaveForm.startDate) { setLeaveError("End date must be on or after start date."); return; }
    if (leaveForm.endDate > LEAVE_MAX_DATE) {
      setLeaveError(`End date cannot be more than 2 years in the future.`); return;
    }

    const days = Math.ceil(
      (new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 86_400_000
    ) + 1;
    if (days > LEAVE_MAX_DAYS) {
      setLeaveError(`Leave duration cannot exceed ${LEAVE_MAX_DAYS} days (${days} days entered).`); return;
    }

    if (!leaveForm.reason.trim()) { setLeaveError("Reason is required."); return; }
    if (leaveForm.reason.trim().length < 5) { setLeaveError("Please provide a more descriptive reason (at least 5 characters)."); return; }
    setLeaveSaving(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leaveForm,
          employeeId: employee!.id,
          employeeCode: employee!.employeeId,
          employeeName: `${employee!.firstName} ${employee!.lastName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setLeaveError(data.error || "Failed to grant leave."); return; }
      setLeaveSuccess("Leave granted successfully.");
      setLeaveRecords((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          totalDays:
            Math.ceil(
              (new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) /
                86_400_000
            ) + 1,
          reason: leaveForm.reason,
          status: "approved",
          createdAt: new Date().toISOString(),
          grantedByHR: true,
        },
        ...prev,
      ]);
      setLeaveForm({ ...EMPTY_LEAVE });
      setTimeout(() => { setLeaveModal(false); setLeaveSuccess(""); }, 1500);
    } catch {
      setLeaveError("Network error. Please try again.");
    } finally {
      setLeaveSaving(false);
    }
  }

  async function toggleStatus() {
    if (!employee) return;
    const isActive = employee.status === "active";
    if (!confirm(isActive ? "Deactivate this employee?" : "Reactivate this employee?")) return;
    setStatusLoading(true); setError("");
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActive ? "inactive" : "active" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      setEmployee((prev) => prev ? { ...prev, status: isActive ? "inactive" : "active" } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!employee) return <div className="text-center py-20 text-gray-500">Employee not found.</div>;

  const isActive = employee.status === "active";
  const todayStr = new Date().toISOString().slice(0, 10);
  // Determine if employee is currently on an approved leave
  const isCurrentlyOnLeave = leaveRecords.some(
    (l) => l.status === "approved" && l.startDate <= todayStr && l.endDate >= todayStr
  );

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/employees")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{employee.firstName} {employee.lastName}</h1>
            <p className="text-sm text-gray-500">{employee.employeeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusVariant(isCurrentlyOnLeave ? "on-leave" : employee.status)}>
            {isCurrentlyOnLeave ? "on leave" : employee.status}
          </Badge>
          {!editing ? (
            <>
              <button onClick={() => { setLeaveForm({ ...EMPTY_LEAVE }); setLeaveError(""); setLeaveSuccess(""); setLeaveModal(true); }}
                className="flex items-center gap-1 border border-blue-200 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-50">
                <CalendarPlus className="w-4 h-4" /> Grant Leave
              </button>
              <button onClick={() => { setForm(employee); setError(""); setEditing(true); }}
                className="flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={toggleStatus}
                disabled={statusLoading}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border disabled:opacity-50 ${
                  isActive
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
              >
                {statusLoading ? <Spinner size="sm" /> : isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </>
          ) : (
            <>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Spinner size="sm" /> : <Check className="w-4 h-4" />} Save
              </button>
              <button onClick={() => { setEditing(false); setError(""); setForm(employee); }}
                className="flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                <X className="w-4 h-4" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-6">
        <div className="py-4"><h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Information</h2></div>
        <Field label="First Name">
          {editing ? <input className={inputCls} value={form.firstName || ""} onChange={set("firstName")} /> : <Display value={employee.firstName} />}
        </Field>
        <Field label="Last Name">
          {editing ? <input className={inputCls} value={form.lastName || ""} onChange={set("lastName")} /> : <Display value={employee.lastName} />}
        </Field>
        <Field label="Email">
          {editing ? <input type="email" className={inputCls} value={form.email || ""} onChange={set("email")} /> : <Display value={employee.email} />}
        </Field>
        <Field label="Phone">
          {editing ? <input className={inputCls} value={form.phone || ""} onChange={set("phone")} /> : <Display value={employee.phone} />}
        </Field>
        <Field label="Date of Birth">
          {editing ? <input type="date" className={inputCls} value={form.dateOfBirth || ""} onChange={set("dateOfBirth")} min="1900-01-01" max={TODAY} /> : <Display value={employee.dateOfBirth} />}
        </Field>
        <Field label="Gender">
          {editing ? (
            <select className={inputCls} value={form.gender || ""} onChange={set("gender")}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          ) : <Display value={employee.gender} />}
        </Field>
        <Field label="Address">
          {editing ? <input className={inputCls} value={form.address || ""} onChange={set("address")} /> : <Display value={employee.address} />}
        </Field>
      </div>

      {/* Employment */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-6">
        <div className="py-4"><h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Employment</h2></div>
        <Field label="Department">
          {editing ? (
            <select className={inputCls} value={form.departmentId || ""} onChange={set("departmentId")}>
              <option value="">Select department…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : <Display value={employee.departmentName} />}
        </Field>
        <Field label="Position">
          {editing ? (
            <select className={inputCls} value={form.positionId || ""} onChange={set("positionId")}
              disabled={!form.departmentId || filteredPositions.length === 0}>
              <option value="">
                {!form.departmentId
                  ? "Select a department first"
                  : filteredPositions.length === 0
                  ? "No positions in this department"
                  : "Select position…"}
              </option>
              {filteredPositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          ) : <Display value={employee.positionTitle} />}
        </Field>
        <Field label="Join Date">
          {editing ? <input type="date" className={inputCls} value={form.joinDate || ""} onChange={set("joinDate")} min="1900-01-01" max={`${THIS_YEAR + 1}-12-31`} /> : <Display value={employee.joinDate?.slice(0, 10)} />}
        </Field>
        <Field label="Salary">
          {editing ? <input type="number" className={inputCls} value={form.salary ?? ""} onChange={set("salary")} min="1" max="10000000" step="1" /> : <Display value={employee.salary ? `$${employee.salary.toLocaleString()}` : undefined} />}
        </Field>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-6">
        <div className="py-4"><h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact</h2></div>
        <Field label="Contact Name">
          {editing ? <input className={inputCls} value={form.emergencyContact || ""} onChange={set("emergencyContact")} /> : <Display value={employee.emergencyContact} />}
        </Field>
        <Field label="Contact Phone">
          {editing ? <input className={inputCls} value={form.emergencyPhone || ""} onChange={set("emergencyPhone")} /> : <Display value={employee.emergencyPhone} />}
        </Field>
      </div>
    </div>

      {/* Leave History */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Leave History</h2>
          </div>
          <span className="text-xs text-gray-400">{leaveRecords.length} record{leaveRecords.length !== 1 ? "s" : ""}</span>
        </div>
        {leavesLoading ? (
          <div className="py-8 flex justify-center"><Spinner size="sm" /></div>
        ) : leaveRecords.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No leave records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Type", "From", "To", "Days", "Status", "Source", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaveRecords.map((l) => {
                  const isActive = l.status === "approved" && l.startDate <= todayStr && l.endDate >= todayStr;
                  const isFuture = l.status === "approved" && l.startDate > todayStr;
                  return (
                    <tr key={l.id} className={`hover:bg-gray-50 ${isActive ? "bg-purple-50" : ""}`}>
                      <td className="px-4 py-3 font-medium capitalize">{l.leaveType}</td>
                      <td className="px-4 py-3">{l.startDate}</td>
                      <td className="px-4 py-3">{l.endDate}</td>
                      <td className="px-4 py-3">{l.totalDays}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Badge className={statusVariant(isActive ? "on-leave" : l.status)}>
                            {isActive ? "on leave" : l.status}
                          </Badge>
                          {isFuture && <span className="text-xs text-blue-500 ml-1">upcoming</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {l.grantedByHR ? (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">HR Granted</span>
                        ) : l.approvedBy ? (
                          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Approved</span>
                        ) : (
                          <span className="text-xs text-gray-400">Self-applied</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLeave(l)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Detail Modal */}
      {selectedLeave && (() => {
        const sel = selectedLeave;
        const todaySel = new Date().toISOString().slice(0, 10);
        const isActiveSel = sel.status === "approved" && sel.startDate <= todaySel && sel.endDate >= todaySel;
        const isFutureSel = sel.status === "approved" && sel.startDate > todaySel;
        return (
          <Modal open={!!selectedLeave} onClose={() => setSelectedLeave(null)} title="Leave Details" size="md">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Leave Type</p>
                  <p className="text-sm font-semibold capitalize">{sel.leaveType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className="flex items-center gap-1">
                    <Badge className={statusVariant(isActiveSel ? "on-leave" : sel.status)}>
                      {isActiveSel ? "on leave" : sel.status}
                    </Badge>
                    {isFutureSel && <span className="text-xs text-blue-500">upcoming</span>}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Start Date</p>
                  <p className="text-sm font-medium">{sel.startDate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">End Date</p>
                  <p className="text-sm font-medium">{sel.endDate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Duration</p>
                  <p className="text-sm font-medium">{sel.totalDays} day{sel.totalDays !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Source</p>
                  <p className="text-sm font-medium">{sel.grantedByHR ? "HR Granted" : sel.approvedBy ? "Approved" : "Self-applied"}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Reason</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{sel.reason}</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setSelectedLeave(null)}
                  className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Close</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Grant Leave Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title={`Grant Leave — ${employee.firstName} ${employee.lastName}`} size="md">
        <div className="space-y-4 p-1">
          {leaveSuccess ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              <Check className="w-4 h-4 shrink-0" />{leaveSuccess}
            </div>
          ) : (
            <>
              {leaveError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{leaveError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type <span className="text-red-500">*</span></label>
                <select className={inputCls} value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))}>
                  <option value="">Select type…</option>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls} value={leaveForm.startDate}
                    min={LEAVE_MIN_DATE} max={LEAVE_MAX_DATE}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value, endDate: e.target.value > p.endDate ? "" : p.endDate }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls} value={leaveForm.endDate}
                    min={leaveForm.startDate || LEAVE_MIN_DATE} max={LEAVE_MAX_DATE}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              {leaveForm.startDate && leaveForm.endDate && leaveForm.endDate >= leaveForm.startDate && (
                <p className="text-xs text-gray-500">
                  Duration: {Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 86_400_000) + 1} day(s)
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea rows={3} className={`${inputCls} resize-none`} value={leaveForm.reason}
                  placeholder="Reason for granting leave…"
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setLeaveModal(false)}
                  className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={grantLeave} disabled={leaveSaving}
                  className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {leaveSaving ? <Spinner size="sm" /> : <CalendarPlus className="w-4 h-4" />} Grant Leave
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

