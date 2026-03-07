"use client";
import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { PageSpinner } from "@/components/ui/Spinner";
import Empty from "@/components/ui/Empty";

interface Notification {
  id: string; title: string; message: string; type: string;
  read: boolean; createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/notifications").then((r) => r.json()).then((r) => { if (r.data) setNotifications(r.data); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PUT" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function remove(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PUT" })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <span className="bg-red-100 text-red-700 text-sm px-2 py-0.5 rounded-full">{unreadCount} unread</span>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <Check className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? <PageSpinner /> : notifications.length === 0 ? <Empty message="No notifications" /> : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-4 px-5 py-4 ${!n.read ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.read ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600" title="Mark as read">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
