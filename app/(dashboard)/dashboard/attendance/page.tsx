"use client";
import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";
import { useAuth } from "@/context/AuthContext";

interface AttendanceRecord {
  id: string; date: string; clockIn?: string; clockOut?: string;
  workingHours?: number; status: string; employeeId: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = () => {
    setLoading(true);
    fetch("/api/attendance?limit=30").then((r) => r.json()).then((r) => {
      if (r.data) {
        setRecords(r.data);
        setTodayRecord(r.data.find((x: AttendanceRecord) => x.date === today) || null);
      }
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function clockIn() {
    setActionLoading(true); setMessage("");
    const res = await fetch("/api/attendance/clock-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setMessage(data.error || "Clock-in failed"); return; }
    setMessage("Clocked in successfully!");
    load();
  }

  async function clockOut() {
    setActionLoading(true); setMessage("");
    const res = await fetch("/api/attendance/clock-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setMessage(data.error || "Clock-out failed"); return; }
    setMessage("Clocked out successfully!");
    load();
  }

  const canClockIn = !todayRecord || (!todayRecord.clockIn);
  const canClockOut = todayRecord?.clockIn && !todayRecord?.clockOut;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
      </div>

      {/* Clock-in/out panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Today — {today}</h2>
        {message && <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">{message}</div>}
        <div className="flex flex-wrap gap-4 items-center">
          {todayRecord && (
            <div className="flex gap-6 text-sm text-gray-600">
              <span>Clock In: <strong>{todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString() : "—"}</strong></span>
              <span>Clock Out: <strong>{todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString() : "—"}</strong></span>
              {todayRecord.workingHours != null && <span>Hours: <strong>{todayRecord.workingHours.toFixed(2)}h</strong></span>}
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={clockIn}
              disabled={!canClockIn || actionLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
            >
              {actionLoading && <Spinner size="sm" />}<LogIn className="w-4 h-4" /> Clock In
            </button>
            <button
              onClick={clockOut}
              disabled={!canClockOut || actionLoading}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
            >
              {actionLoading && <Spinner size="sm" />}<LogOut className="w-4 h-4" /> Clock Out
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent History</h2>
        </div>
        {loading ? <PageSpinner /> : records.length === 0 ? <Empty message="No attendance records" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Date", "Clock In", "Clock Out", "Hours", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.date}</td>
                    <td className="px-4 py-3 text-gray-600">{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.workingHours != null ? `${r.workingHours.toFixed(2)}h` : "—"}</td>
                    <td className="px-4 py-3"><Badge className={statusVariant(r.status)}>{r.status}</Badge></td>
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
