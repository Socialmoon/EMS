"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

interface SelectOption { id: string; name: string; }

export default function NewEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [positions, setPositions] = useState<SelectOption[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    departmentId: "", positionId: "", joinDate: "", salary: "",
    address: "", emergencyContact: "", emergencyPhone: "",
    gender: "", dateOfBirth: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/positions").then((r) => r.json()),
    ]).then(([d, p]) => {
      setDepartments(d.data || []);
      setPositions(p.data || []);
    });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const body = { ...form, salary: form.salary ? Number(form.salary) : undefined };
    const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Failed to create employee"); return; }
    router.push(`/employees/${data.data.id}`);
  }

  const field = (label: string, k: keyof typeof form, type = "text", required = false) => (
    <div key={k}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input required={required} type={type} value={form[k]} onChange={set(k)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-semibold text-gray-900">Add New Employee</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Personal Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("First Name", "firstName", "text", true)}
            {field("Last Name", "lastName", "text", true)}
            {field("Email", "email", "email", true)}
            {field("Phone", "phone")}
            {field("Date of Birth", "dateOfBirth", "date")}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={set("gender")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Employment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.departmentId} onChange={set("departmentId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select department…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select value={form.positionId} onChange={set("positionId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select position…</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {field("Join Date", "joinDate", "date", true)}
            {field("Salary (monthly)", "salary", "number")}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Contact & Emergency</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Address", "address")}
            {field("Emergency Contact Name", "emergencyContact")}
            {field("Emergency Phone", "emergencyPhone")}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting && <Spinner size="sm" />} Create Employee
          </button>
        </div>
      </form>
    </div>
  );
}
