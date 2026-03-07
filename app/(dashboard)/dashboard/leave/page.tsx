"use client";
import { useEffect, useState } from "react";
import { CalendarOff, Plus } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface LeaveRequest {
  id: string; leaveType: string; startDate: string; endDate: string;
  totalDays: number; reason: string; status: string; createdAt: string;
}

const LEAVE_TYPES = ["annual", "sick", "casual", "maternity", "paternity", "unpaid", "other"];

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/leave").then((r) => r.json()).then((r) => { if (r.data) setRequests(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function apply() {
    setSaving(true); setError("");
    const res = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Application failed"); return; }
    setModalOpen(false);
    load();
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarOff className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Leave Requests</h1>
        </div>
        <button onClick={() => { setForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" }); setError(""); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : requests.length === 0 ? <Empty message="No leave requests" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Type", "From", "To", "Days", "Reason", "Status", "Applied"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize font-medium">{r.leaveType}</td>
                    <td className="px-4 py-3">{r.startDate}</td>
                    <td className="px-4 py-3">{r.endDate}</td>
                    <td className="px-4 py-3">{r.totalDays}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3"><Badge className={statusVariant(r.status)}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{r.createdAt?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select value={form.leaveType} onChange={set("leaveType")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.startDate} onChange={set("startDate")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.endDate} onChange={set("endDate")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={set("reason")} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={apply} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving && <Spinner size="sm" />} Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
