"use client";
import { useEffect, useState } from "react";
import { CheckCheck, Check, X } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface LeaveRequest {
  id: string; employeeId: string; employeeName?: string; leaveType: string;
  startDate: string; endDate: string; totalDays: number; reason: string;
  status: string; createdAt: string;
}

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/leave?status=pending").then((r) => r.json()).then((r) => { if (r.data) setRequests(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function action(id: string, type: "approve" | "reject") {
    setProcessing(id);
    await fetch(`/api/leave/${id}/${type}`, { method: "PUT" });
    setProcessing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Leave Approvals</h1>
        <span className="bg-yellow-100 text-yellow-700 text-sm px-2 py-0.5 rounded-full">{requests.filter((r) => r.status === "pending").length} pending</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : requests.length === 0 ? <Empty message="No pending leave requests" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Employee", "Type", "From", "To", "Days", "Reason", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.employeeName || r.employeeId}</td>
                    <td className="px-4 py-3 capitalize">{r.leaveType}</td>
                    <td className="px-4 py-3">{r.startDate}</td>
                    <td className="px-4 py-3">{r.endDate}</td>
                    <td className="px-4 py-3">{r.totalDays}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3"><Badge className={statusVariant(r.status)}>{r.status}</Badge></td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => action(r.id, "approve")} disabled={processing === r.id} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                            {processing === r.id ? <Spinner size="sm" /> : <Check className="w-3 h-3" />} Approve
                          </button>
                          <button onClick={() => action(r.id, "reject")} disabled={processing === r.id} className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
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
