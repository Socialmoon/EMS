"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface Payslip {
  id: string; employeeId: string; employeeName?: string;
  month: string; basicSalary: number; grossPay: number; netPay: number; status: string;
}

export default function PayrollPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/payroll?month=${monthFilter}`).then((r) => r.json()).then((r) => { if (r.data) setPayslips(r.data); }).finally(() => setLoading(false));
  }, [monthFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : payslips.length === 0 ? <Empty message="No payroll records" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Employee", "Month", "Basic Salary", "Gross Pay", "Net Pay", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.employeeName || p.employeeId}</td>
                    <td className="px-4 py-3">{p.month}</td>
                    <td className="px-4 py-3">${p.basicSalary?.toLocaleString()}</td>
                    <td className="px-4 py-3">${p.grossPay?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">${p.netPay?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge className={statusVariant(p.status)}>{p.status}</Badge></td>
                    <td className="px-4 py-3">
                      <Link href={`/payroll/${p.id}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link>
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
