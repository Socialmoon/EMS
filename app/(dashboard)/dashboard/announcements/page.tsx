"use client";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Pin, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";
import { useAuth } from "@/context/AuthContext";

interface Announcement {
  id: string; title: string; content: string; category: string;
  pinned: boolean; authorId: string; createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  hr: "bg-blue-100 text-blue-700",
  event: "bg-purple-100 text-purple-700",
  urgent: "bg-red-100 text-red-700",
};

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general", pinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/announcements").then((r) => r.json()).then((r) => { if (r.data) setItems(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function post() {
    setSaving(true); setError("");
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to post"); return; }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    load();
  }

  const canPost = role === "admin" || role === "hr";
  const sorted = [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
        </div>
        {canPost && (
          <button onClick={() => { setForm({ title: "", content: "", category: "general", pinned: false }); setError(""); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {loading ? <PageSpinner /> : sorted.length === 0 ? <Empty message="No announcements" /> : (
        <div className="space-y-4">
          {sorted.map((a) => (
            <div key={a.id} className={`bg-white border rounded-xl p-5 ${a.pinned ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-200"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="w-4 h-4 text-blue-500" />}
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[a.category] || CATEGORY_COLORS.general}`}>{a.category}</span>
                </div>
                {canPost && (
                  <button onClick={() => remove(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{a.content}</p>
              <p className="text-xs text-gray-400 mt-3">{new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Announcement">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={set("title")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
            <textarea value={form.content} onChange={set("content")} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={set("category")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["general", "hr", "event", "urgent"].map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Pin to top</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={post} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving && <Spinner size="sm" />} Post
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
