"use client";
import { useEffect, useState } from "react";
import { Star, Plus } from "lucide-react";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";
import { useAuth } from "@/context/AuthContext";

interface Review {
  id: string; employeeId: string; reviewType: string; overallRating?: number;
  status: string; goals: { title: string; progress: number }[];
  selfAssessment?: string; managerReview?: string; createdAt: string;
}

export default function PerformancePage() {
  const { role } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ reviewType: "q1", selfAssessment: "", goal: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/performance").then((r) => r.json()).then((r) => { if (r.data) setReviews(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    setSaving(true); setError("");
    const body = {
      reviewType: form.reviewType,
      selfAssessment: form.selfAssessment,
      goals: form.goal ? [{ title: form.goal, progress: 0 }] : [],
      employeeId: "self",
    };
    const res = await fetch("/api/performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to submit"); return; }
    setModalOpen(false);
    load();
  }

  const STARS = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Performance Reviews</h1>
        </div>
        <button onClick={() => { setForm({ reviewType: "q1", selfAssessment: "", goal: "" }); setError(""); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Review
        </button>
      </div>

      {loading ? <PageSpinner /> : reviews.length === 0 ? <Empty message="No performance reviews" /> : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded uppercase">{r.reviewType}</span>
                  <Badge className={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                {r.overallRating && (
                  <div className="flex items-center gap-1">
                    {STARS.map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= r.overallRating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">{r.overallRating}/5</span>
                  </div>
                )}
              </div>
              {r.goals.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Goals</p>
                  <div className="space-y-2">
                    {r.goals.map((g, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1"><span>{g.title}</span><span>{g.progress}%</span></div>
                        <div className="h-1.5 bg-gray-100 rounded-full"><div style={{ width: `${g.progress}%` }} className="h-full bg-blue-500 rounded-full" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {r.selfAssessment && <p className="text-sm text-gray-600"><strong>Self: </strong>{r.selfAssessment}</p>}
              {r.managerReview && <p className="text-sm text-gray-600 mt-1"><strong>Manager: </strong>{r.managerReview}</p>}
              <p className="text-xs text-gray-400 mt-3">{r.createdAt?.slice(0, 10)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Start Review">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Period</label>
            <select value={form.reviewType} onChange={set("reviewType")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["q1", "q2", "q3", "q4", "annual"].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add a Goal</label>
            <input value={form.goal} onChange={set("goal")} placeholder="e.g. Complete certification" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Self Assessment</label>
            <textarea value={form.selfAssessment} onChange={set("selfAssessment")} rows={3} placeholder="How did this period go?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving && <Spinner size="sm" />} Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
