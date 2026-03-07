"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Check, X } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";

interface Employee {
  id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone?: string; departmentId?: string; departmentName?: string;
  positionId?: string; positionTitle?: string; status: string; joinDate: string;
  salary?: number; address?: string; gender?: string; dateOfBirth?: string;
  emergencyContact?: string; emergencyPhone?: string;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/employees/${id}`).then((r) => r.json()).then((r) => {
      if (r.data) { setEmployee(r.data); setForm(r.data); }
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function save() {
    setSaving(true); setError("");
    const res = await fetch(`/api/employees/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Update failed"); return; }
    setEmployee((prev) => ({ ...prev!, ...form }));
    setEditing(false);
  }

  async function deactivate() {
    if (!confirm("Deactivate this employee?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.push("/employees");
  }

  if (loading) return <PageSpinner />;
  if (!employee) return <div className="text-center py-20 text-gray-500">Employee not found.</div>;

  const row = (label: string, value: string | undefined | null) => (
    <div key={label} className="py-3 grid grid-cols-3">
      <span className="text-sm text-gray-500">{label}</span>
      {editing && ["Phone", "Address", "Emergency Contact", "Emergency Phone", "Salary"].includes(label) ? (
        <input className="col-span-2 border border-gray-200 rounded px-2 py-1 text-sm" defaultValue={value || ""} onChange={set(label.toLowerCase().replace(/ /g, "") as keyof Employee)} />
      ) : (
        <span className="col-span-2 text-sm text-gray-900">{value || "—"}</span>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{employee.firstName} {employee.lastName}</h1>
            <p className="text-sm text-gray-500">{employee.employeeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusVariant(employee.status)}>{employee.status}</Badge>
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"><Pencil className="w-4 h-4" /> Edit</button>
              <button onClick={deactivate} className="flex items-center gap-1 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50"><Trash2 className="w-4 h-4" /> Deactivate</button>
            </>
          ) : (
            <>
              <button onClick={save} disabled={saving} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving && <Spinner size="sm" />}<Check className="w-4 h-4" /> Save</button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"><X className="w-4 h-4" /> Cancel</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-6">
        <div className="py-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Information</h2>
        </div>
        {row("First Name", employee.firstName)}
        {row("Last Name", employee.lastName)}
        {row("Email", employee.email)}
        {row("Phone", employee.phone)}
        {row("Date of Birth", employee.dateOfBirth)}
        {row("Gender", employee.gender)}
        {row("Address", employee.address)}
        <div className="py-4 mt-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Employment</h2>
        </div>
        {row("Department", employee.departmentName)}
        {row("Position", employee.positionTitle)}
        {row("Join Date", employee.joinDate?.slice(0, 10))}
        {row("Salary", employee.salary ? `$${employee.salary.toLocaleString()}` : undefined)}
        <div className="py-4 mt-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact</h2>
        </div>
        {row("Emergency Contact", employee.emergencyContact)}
        {row("Emergency Phone", employee.emergencyPhone)}
      </div>
    </div>
  );
}
