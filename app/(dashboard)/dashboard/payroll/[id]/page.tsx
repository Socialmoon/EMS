"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";

interface Payslip {
  id: string; employeeId: string; employeeName?: string; month: string;
  basicSalary: number; allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossPay: number; totalDeductions: number; netPay: number; status: string; notes?: string;
}

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    fetch(`/api/payroll/${id}`).then((r) => r.json()).then((r) => { if (r.data) setPayslip(r.data); }).finally(() => setLoading(false));
  }, [id]);

  async function finalize() {
    setFinalizing(true);
    const res = await fetch(`/api/payroll/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "finalized" }) });
    const data = await res.json();
    setFinalizing(false);
    if (res.ok) setPayslip((p) => p ? { ...p, status: "finalized" } : p);
  }

  if (loading) return <PageSpinner />;
  if (!payslip) return <div className="text-center py-20 text-gray-500">Payslip not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-semibold text-gray-900">Payslip — {payslip.month}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusVariant(payslip.status)}>{payslip.status}</Badge>
          {(role === "admin" || role === "hr") && payslip.status === "draft" && (
            <button onClick={finalize} disabled={finalizing} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {finalizing && <Spinner size="sm" />} Finalize
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 print:shadow-none">
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Employee</p>
            <p className="font-semibold text-gray-900">{payslip.employeeName || payslip.employeeId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pay Period</p>
            <p className="font-semibold text-gray-900">{payslip.month}</p>
          </div>
        </div>

        <hr />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Basic Salary</span><span>${payslip.basicSalary?.toLocaleString()}</span></div>
              {payslip.allowances?.map((a) => (
                <div key={a.name} className="flex justify-between text-sm text-green-700"><span>{a.name}</span><span>+${a.amount?.toLocaleString()}</span></div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t pt-2"><span>Gross Pay</span><span>${payslip.grossPay?.toLocaleString()}</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Deductions</h3>
            <div className="space-y-2">
              {payslip.deductions?.map((d) => (
                <div key={d.name} className="flex justify-between text-sm text-red-600"><span>{d.name}</span><span>-${d.amount?.toLocaleString()}</span></div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t pt-2"><span>Total Deductions</span><span>-${payslip.totalDeductions?.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Net Pay</span>
          <span className="text-2xl font-bold text-green-700">${payslip.netPay?.toLocaleString()}</span>
        </div>

        {payslip.notes && <div className="text-sm text-gray-500"><strong>Notes:</strong> {payslip.notes}</div>}
      </div>
    </div>
  );
}
