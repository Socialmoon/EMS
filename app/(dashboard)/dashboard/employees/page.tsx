"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search, Plus, Filter } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/employees?${params}`)
      .then((r) => r.json())
      .then((r) => { if (r.data) setEmployees(r.data); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <Link href="/employees/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Employee
        </Link>
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
                      <Link href={`/employees/${emp.id}`} className="text-blue-600 hover:underline font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
