"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import app from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import Spinner, { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface Doc {
  id: string; name: string; type: string; fileUrl: string; fileSize?: number;
  mimeType?: string; employeeId: string; createdAt: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/documents").then((r) => r.json()).then((r) => { if (r.data) setDocs(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true); setError(""); setProgress(0);
    try {
      const storage = getStorage(app);
      const path = `documents/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed", (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)));
      await task;
      const url = await getDownloadURL(storageRef);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: docType, employeeId: user.uid, fileUrl: url, filePath: path, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to save document");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    load();
  }

  const fmtSize = (bytes?: number) => bytes ? `${(bytes / 1024).toFixed(1)} KB` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Upload Document</h2>
        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["contract", "id", "certificate", "resume", "other"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input ref={fileRef} type="file" onChange={handleUpload} disabled={uploading} className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> {progress}%
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : docs.length === 0 ? <Empty message="No documents uploaded" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Name", "Type", "Size", "Uploaded", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 capitalize">
                      <Badge className="bg-gray-100 text-gray-700">{d.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtSize(d.fileSize)}</td>
                    <td className="px-4 py-3 text-gray-400">{d.createdAt?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded text-blue-600"><ExternalLink className="w-4 h-4" /></a>
                        <button onClick={() => remove(d.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
