"use client";
import { useEffect, useState, useMemo } from "react";
import { CalendarOff, Plus, Eye, Search, AlertCircle, Users, Calendar, Clock } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";
import { useAuth } from "@/context/AuthContext";

interface LeaveRecord {
  id: string; leaveType: string; startDate: string; endDate: string;
  totalDays: number; reason: string; status: string; createdAt: string;
  employeeId?: string; employeeCode?: string; employeeName?: string;
  grantedByHR?: boolean; approvedBy?: string;
}

const LEAVE_TYPES = ["annual", "sick", "casual", "maternity", "paternity", "unpaid", "other"];
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function LeavePage() {
  const { role } = useAuth();
  const isPrivileged = role === "admin" || role === "hr" || role === "manager";

  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Apply modal state (for employees)
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Detail modal
  const [selected, setSelected] = useState<LeaveRecord | null>(null);

  const load = async () => {
    setFetchError("");
    setLoading(true);
    try {
      // HR/admin: fetch all approved leaves; employees: fetch their own
      const url = isPrivileged ? "/api/leave?status=approved" : "/api/leave";
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Server error: ${r.status}`);
      const data = await r.json();
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load leave records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== null) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter !== "all" && r.leaveType.toLowerCase() !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (r.employeeName || "").toLowerCase();
        const type = r.leaveType.toLowerCase();
        if (!name.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [records, typeFilter, search]);

  // Stats
  const currentlyOnLeave = records.filter(
    (r) => r.status === "approved" && r.startDate <= todayStr && r.endDate >= todayStr
  ).length;
  const upcoming = records.filter(
    (r) => r.status === "approved" && r.startDate > todayStr
  ).length;

  async function apply() {
    setApplyError("");
    if (!form.startDate) { setApplyError("Start date is required."); return; }
    if (!form.endDate) { setApplyError("End date is required."); return; }
    if (form.endDate < form.startDate) { setApplyError("End date must be on or after start date."); return; }
    if (!form.reason.trim()) { setApplyError("Reason is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setApplyError(data.error || "Submission failed."); return; }
      setApplyOpen(false);
      load();
    } catch {
      setApplyError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarOff className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">
            {isPrivileged ? "Approved Leaves" : "My Leave Requests"}
          </h1>
          <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        {!isPrivileged && (
          <button
            onClick={() => { setForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" }); setApplyError(""); setApplyOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        )}
      </div>

      {/* Stats cards — HR/admin only */}
      {isPrivileged && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
              <p className="text-xs text-gray-500">Total approved</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="p-2 bg-purple-50 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{currentlyOnLeave}</p>
              <p className="text-xs text-gray-500">Currently on leave</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcoming}</p>
              <p className="text-xs text-gray-500">Upcoming leaves</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        {isPrivileged && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or leave type…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{fetchError}
          <button onClick={load} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : filtered.length === 0 ? <Empty message="No leave records found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    ...(isPrivileged ? ["Employee", "ID"] : []),
                    "Type", "From", "To", "Days", "Status", "Source", "",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const isActive = r.status === "approved" && r.startDate <= todayStr && r.endDate >= todayStr;
                  const isFuture = r.status === "approved" && r.startDate > todayStr;
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${isActive ? "bg-purple-50" : ""}`}>
                      {isPrivileged && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.employeeName || <span className="text-gray-400">—</span>}
                        </td>
                      )}
                      {isPrivileged && (
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {r.employeeCode || <span className="text-gray-400">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium capitalize">{r.leaveType}</td>
                      <td className="px-4 py-3 text-gray-600">{r.startDate}</td>
                      <td className="px-4 py-3 text-gray-600">{r.endDate}</td>
                      <td className="px-4 py-3 text-gray-600">{r.totalDays}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge className={statusVariant(isActive ? "on-leave" : r.status)}>
                            {isActive ? "on leave" : r.status}
                          </Badge>
                          {isFuture && <span className="text-xs text-blue-500">upcoming</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.grantedByHR
                          ? <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">HR Granted</span>
                          : r.approvedBy
                          ? <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Approved</span>
                          : <span className="text-xs text-gray-400">Self-applied</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(r)}
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

      {/* Detail Modal */}
      {selected && (() => {
        const s = selected;
        const isActive = s.status === "approved" && s.startDate <= todayStr && s.endDate >= todayStr;
        const isFuture = s.status === "approved" && s.startDate > todayStr;
        return (
          <Modal open={!!selected} onClose={() => setSelected(null)} title="Leave Details" size="md">
            <div className="space-y-4">
              {isPrivileged && s.employeeName && (
                <div className="bg-blue-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-400 mb-0.5">Employee</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {s.employeeName}
                    {s.employeeCode && <span className="ml-2 font-mono text-xs text-blue-500">({s.employeeCode})</span>}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Leave Type</p>
                  <p className="text-sm font-semibold capitalize">{s.leaveType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className="flex items-center gap-1">
                    <Badge className={statusVariant(isActive ? "on-leave" : s.status)}>
                      {isActive ? "on leave" : s.status}
                    </Badge>
                    {isFuture && <span className="text-xs text-blue-500">upcoming</span>}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Start Date</p>
                  <p className="text-sm font-medium">{s.startDate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">End Date</p>
                  <p className="text-sm font-medium">{s.endDate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Duration</p>
                  <p className="text-sm font-medium">{s.totalDays} day{s.totalDays !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Source</p>
                  <p className="text-sm font-medium">
                    {s.grantedByHR ? "HR Granted" : s.approvedBy ? "Approved" : "Self-applied"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Reason</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{s.reason}</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setSelected(null)}
                  className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Close</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Apply for Leave Modal (employee only) */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave" size="md">
        <div className="space-y-4">
          {applyError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{applyError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select value={form.leaveType} onChange={setField("leaveType")} className={inputCls}>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.startDate} onChange={setField("startDate")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={setField("endDate")} className={inputCls} />
            </div>
          </div>
          {form.startDate && form.endDate && form.endDate >= form.startDate && (
            <p className="text-xs text-gray-500">
              Duration: {Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000) + 1} day(s)
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={setField("reason")} rows={3} className={`${inputCls} resize-none`} placeholder="Describe the reason for your leave…" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setApplyOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={apply} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving && <Spinner size="sm" />} Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
