"use client";
import { useEffect, useState } from "react";
import { Building2, Plus, Pencil, Trash2, Search, Users, AlertCircle, Briefcase, ChevronDown, ChevronUp, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface Department { id: string; name: string; description?: string; managerId?: string; }
interface Position { id: string; title: string; departmentId?: string; description?: string; }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [positionsMap, setPositionsMap] = useState<Record<string, Position[]>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Positions panel per department
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [posModal, setPosModal] = useState<{ deptId: string; deptName: string } | null>(null);
  const [posForm, setPosForm] = useState({ title: "", description: "" });
  const [posSaving, setPosSaving] = useState(false);
  const [posError, setPosError] = useState("");
  const [deletingPosId, setDeletingPosId] = useState<string | null>(null);

  async function savePosition() {
    if (!posModal) return;
    if (!posForm.title.trim()) { setPosError("Position title is required."); return; }
    setPosError("");
    setPosSaving(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: posForm.title.trim(), departmentId: posModal.deptId, description: posForm.description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setPosError(data.error || "Failed to create position."); return; }
      setPosModal(null);
      load();
    } catch (err) {
      setPosError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setPosSaving(false);
    }
  }

  async function deletePosition(posId: string) {
    if (!confirm("Delete this position?")) return;
    setDeletingPosId(posId);
    try {
      const res = await fetch(`/api/positions/${posId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete position.");
    } finally {
      setDeletingPosId(null);
    }
  }

  const load = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [dRes, eRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/employees"),
      ]);
      if (!dRes.ok) throw new Error(`Failed to load departments (${dRes.status})`);
      const [dData, eData] = await Promise.all([dRes.json(), eRes.json()]);
      const depts: Department[] = dData.data || [];
      setDepartments(depts);
      // Build headcount map from employees list
      const counts: Record<string, number> = {};
      for (const emp of (eData.data || []) as { departmentId?: string; status?: string }[]) {
        if (emp.departmentId && emp.status === "active") {
          counts[emp.departmentId] = (counts[emp.departmentId] || 0) + 1;
        }
      }
      setEmployeeCounts(counts);
      // Build positions map
      const pRes = await fetch("/api/positions");
      if (pRes.ok) {
        const pData = await pRes.json();
        const map: Record<string, Position[]> = {};
        for (const pos of (pData.data || []) as Position[]) {
          if (pos.departmentId) {
            map[pos.departmentId] = [...(map[pos.departmentId] || []), pos];
          }
        }
        setPositionsMap(map);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm({ name: "", description: "" }); setError(""); setModalOpen(true); }
  function openEdit(d: Department) { setEditing(d); setForm({ name: d.name, description: d.description || "" }); setError(""); setModalOpen(true); }

  async function save() {
    const trimmedName = form.name.trim();
    if (!trimmedName) { setError("Department name is required."); return; }
    if (trimmedName.length < 2) { setError("Name must be at least 2 characters."); return; }
    // Duplicate name check (client-side)
    const duplicate = departments.find(
      (d) => d.name.toLowerCase() === trimmedName.toLowerCase() && d.id !== editing?.id
    );
    if (duplicate) { setError(`A department named "${trimmedName}" already exists.`); return; }
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmedName, description: form.description.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Operation failed."); return; }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Employees assigned to it will not be affected.`)) return;
    setDeleteError("");
    setDeletingId(id);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete (${res.status})`);
      }
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete department.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = departments.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Error banners */}
      {fetchError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {fetchError}
          <button onClick={load} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {deleteError}
          <button onClick={() => setDeleteError("")} className="ml-auto underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <Empty message={search ? "No departments match your search" : "No departments yet"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => {
            const deptPositions = positionsMap[d.id] || [];
            const isExpanded = expandedDeptId === d.id;
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{d.name}</h3>
                      {d.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{d.description}</p>}
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(d.id, d.name)}
                        disabled={deletingId === d.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === d.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{employeeCounts[d.id] ?? 0} employee{(employeeCounts[d.id] ?? 0) !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{deptPositions.length} position{deptPositions.length !== 1 ? "s" : ""}</span>
                    </div>
                    <button
                      onClick={() => setExpandedDeptId(isExpanded ? null : d.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Hide</> : <><ChevronDown className="w-3.5 h-3.5" />Positions</>}
                    </button>
                  </div>
                </div>

                {/* Expandable positions panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Positions</span>
                      <button
                        onClick={() => { setPosForm({ title: "", description: "" }); setPosError(""); setPosModal({ deptId: d.id, deptName: d.name }); }}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-3 h-3" /> Add Position
                      </button>
                    </div>
                    {deptPositions.length === 0 ? (
                      <p className="text-sm text-gray-400 py-1">No positions yet for this department.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {deptPositions.map((pos) => (
                          <li key={pos.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{pos.title}</span>
                              {pos.description && <span className="ml-2 text-gray-400 text-xs">{pos.description}</span>}
                            </div>
                            <button
                              onClick={() => deletePosition(pos.id)}
                              disabled={deletingPosId === pos.id}
                              className="ml-2 p-1 rounded hover:bg-red-50 text-red-400 disabled:opacity-40"
                              title="Delete position"
                            >
                              {deletingPosId === pos.id ? <Spinner size="sm" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Position Modal */}
      <Modal open={!!posModal} onClose={() => setPosModal(null)} title={`Add Position — ${posModal?.deptName ?? ""}`}>
        <div className="space-y-4">
          {posError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{posError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              value={posForm.title}
              onChange={(e) => setPosForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Senior Engineer"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={posForm.description}
              onChange={(e) => setPosForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setPosModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={savePosition} disabled={posSaving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {posSaving && <Spinner size="sm" />} Create Position
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Department" : "Add Department"}>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Engineering"
              className={inputCls}
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of this department…"
              className={inputCls}
              maxLength={300}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/300</p>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving && <Spinner size="sm" />} {editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
