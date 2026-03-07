"use client";
import { useEffect, useState } from "react";
import { BarChart3, Users, Clock, CalendarOff, DollarSign } from "lucide-react";

interface HeadcountData { total: number; byDepartment: Record<string, number>; byStatus: Record<string, number>; }
interface AttendanceData { month: string; totalRecords: number; summary: Record<string, { present: number; absent: number; late: number; totalHours: number }>; }
interface LeaveData { year: string; byType: Record<string, number>; byStatus: Record<string, number>; totalDays: number; }
interface PayrollData { month: string; totalGross: number; totalNet: number; totalDeductions: number; count: number; byStatus: Record<string, number>; }

export default function ReportsPage() {
  const [headcount, setHeadcount] = useState<HeadcountData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [leave, setLeave] = useState<LeaveData | null>(null);
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/reports/headcount").then((r) => r.json()),
      fetch(`/api/reports/attendance?month=${month}`).then((r) => r.json()),
      fetch(`/api/reports/leave?year=${year}`).then((r) => r.json()),
      fetch(`/api/reports/payroll?month=${month}`).then((r) => r.json()),
    ]).then(([h, a, l, p]) => {
      setHeadcount(h.data);
      setAttendance(a.data);
      setLeave(l.data);
      setPayroll(p.data);
    }).finally(() => setLoading(false));
  }, [month, year]);

  const StatCard = ({ icon: Icon, title, value, sub, color }: { icon: React.ElementType; title: string; value: string | number; sub?: string; color: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  const DistBar = ({ data, title }: { data: Record<string, number>; title: string }) => {
    const total = Object.values(data).reduce((s, v) => s + v, 0);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize text-gray-600">{key}</span>
                <span className="font-medium text-gray-900">{val} ({total ? Math.round((val / total) * 100) : 0}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div style={{ width: `${total ? (val / total) * 100 : 0}%` }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading reports…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} title="Total Employees" value={headcount?.total || 0} sub={`${headcount?.byStatus?.active || 0} active`} color="bg-blue-500" />
            <StatCard icon={Clock} title="Attendance Records" value={attendance?.totalRecords || 0} sub={`For ${month}`} color="bg-green-500" />
            <StatCard icon={CalendarOff} title="Leave Days Taken" value={leave?.totalDays || 0} sub={`In ${year}`} color="bg-orange-500" />
            <StatCard icon={DollarSign} title="Net Payroll" value={payroll ? `$${payroll.totalNet.toLocaleString()}` : "—"} sub={`For ${month}`} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {headcount?.byDepartment && Object.keys(headcount.byDepartment).length > 0 && (
              <DistBar data={headcount.byDepartment} title="Employees by Department" />
            )}
            {headcount?.byStatus && Object.keys(headcount.byStatus).length > 0 && (
              <DistBar data={headcount.byStatus} title="Employee Status" />
            )}
            {leave?.byType && Object.keys(leave.byType).length > 0 && (
              <DistBar data={leave.byType} title="Leave by Type" />
            )}
            {leave?.byStatus && Object.keys(leave.byStatus).length > 0 && (
              <DistBar data={leave.byStatus} title="Leave by Status" />
            )}
          </div>

          {payroll && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Payroll Summary — {payroll.month}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-gray-500 mb-1">Gross Pay</p><p className="text-xl font-bold text-gray-900">${payroll.totalGross.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Deductions</p><p className="text-xl font-bold text-red-600">-${payroll.totalDeductions.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Net Pay</p><p className="text-xl font-bold text-green-700">${payroll.totalNet.toLocaleString()}</p></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
