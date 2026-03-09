"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Search, Plus, AlertCircle } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";
import Modal from "@/components/ui/Modal";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  positionTitle?: string;
  status: string;
  joinDate: string;
}

interface DeptOption { id: string; name: string; }
interface PosOption { id: string; title: string; departmentId?: string; }

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", phone: "",
  departmentId: "", positionId: "", joinDate: "", salary: "",
  address: "", emergencyContact: "", emergencyPhone: "",
  gender: "", dateOfBirth: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TODAY = new Date();
const THIS_YEAR = TODAY.getFullYear();

function isValidDate(str: string, minYear: number, maxYear: number): boolean {
  if (!str) return false;
  const d = new Date(str);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= minYear && y <= maxYear;
}

function validateForm(form: typeof EMPTY_FORM): string | null {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(form.email.trim())) return "Please enter a valid email address.";
  if (form.dateOfBirth && !isValidDate(form.dateOfBirth, 1900, THIS_YEAR))
    return "Date of birth must be between year 1900 and today.";
  if (!form.joinDate) return "Join date is required.";
  if (!isValidDate(form.joinDate, 1900, THIS_YEAR + 1))
    return "Join date must be a valid date (year 1900 – next year).";
  if (form.salary) {
    const sal = Number(form.salary);
    if (isNaN(sal) || sal < 0) return "Salary must be a positive number.";
    if (sal > 10_000_000) return "Salary seems unrealistically high. Please enter a valid monthly salary.";
  }
  return null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Employee modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [allPositions, setAllPositions] = useState<PosOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchEmployees = useCallback(async () => {
    setFetchError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/employees?${params}`);
      if (!r.ok) throw new Error(`Server error: ${r.status}`);
      const data = await r.json();
      if (data.data) setEmployees(data.data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Fetch departments & positions once
  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, pRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/positions"),
        ]);
        const [d, p] = await Promise.all([dRes.json(), pRes.json()]);
        setDepartments(d.data || []);
        setAllPositions(p.data || []);
      } catch {
        // non-critical — dropdowns will just be empty
      }
    };
    load();
  }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.firstName?.toLowerCase().includes(q) ||
      e.lastName?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q)
    );
  });

  // Only show positions for the selected department; empty when no department chosen
  const filteredPositions = form.departmentId
    ? allPositions.filter((p) => p.departmentId === form.departmentId)
    : [];

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  // Changing department clears position so stale value isn't kept
  function handleDeptChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, departmentId: e.target.value, positionId: "" }));
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm(form);
    if (validationError) { setFormError(validationError); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const body = { ...form, salary: form.salary ? Number(form.salary) : undefined };
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // Use server message directly — it now contains field-level detail
        setFormError(data.error || "Failed to create employee.");
        return;
      }
      setModalOpen(false);
      setLoading(true);
      fetchEmployees();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectCls = inputCls;

  const textField = (label: string, k: keyof typeof EMPTY_FORM, type = "text", required = false) => (
    <div key={k}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input required={required} type={type} value={form[k]} onChange={setField(k)} className={inputCls} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or ID…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on-leave">On Leave</option>
        </select>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {fetchError}
          <button onClick={() => { setLoading(true); fetchEmployees(); }} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <Empty message="No employees found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["ID", "Name", "Email", "Department", "Position", "Status", "Joined", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{emp.employeeId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.firstName} {emp.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.departmentName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.positionTitle || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusVariant(emp.status)}>{emp.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{emp.joinDate?.slice(0, 10) || "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/employees/${emp.id}`} className="text-blue-600 hover:underline font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal title="Add New Employee" open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
          )}

          {/* Personal Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {textField("First Name", "firstName", "text", true)}
              {textField("Last Name", "lastName", "text", true)}
              {textField("Email", "email", "email", true)}
              {textField("Phone", "phone")}
              {textField("Date of Birth", "dateOfBirth", "date")}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={form.gender} onChange={setField("gender")} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employment */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Employment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={form.departmentId} onChange={handleDeptChange} className={selectCls}>
                  <option value="">Select department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select value={form.positionId} onChange={setField("positionId")} className={selectCls}
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
                {!form.departmentId && (
                  <p className="text-xs text-gray-400 mt-1">Select a department to see available positions.</p>
                )}
                {form.departmentId && filteredPositions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No positions exist for this department yet. Add one in the Positions tab.</p>
                )}
              </div>
              {textField("Join Date", "joinDate", "date", true)}
              {textField("Salary (monthly)", "salary", "number")}
            </div>
          </div>

          {/* Contact & Emergency */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact & Emergency</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {textField("Address", "address")}
              {textField("Emergency Contact Name", "emergencyContact")}
              {textField("Emergency Phone", "emergencyPhone")}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting && <Spinner size="sm" />} Create Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
