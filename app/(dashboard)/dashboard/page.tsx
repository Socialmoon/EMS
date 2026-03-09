"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, CalendarOff, CheckCircle, Megaphone } from "lucide-react";

interface Stats { employees: number; presentToday: number; onLeave: number; pendingLeave: number; }
interface Announcement { id: string; title: string; content: string; category: string; createdAt: string; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ employees: 0, presentToday: 0, onLeave: 0, pendingLeave: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [empRes, attRes, leaveRes, annRes] = await Promise.all([
          fetch("/api/employees").then((r) => r.json()),
          fetch(`/api/attendance?date=${today}`).then((r) => r.json()),
          fetch("/api/leave?status=pending").then((r) => r.json()),
          fetch("/api/announcements").then((r) => r.json()),
        ]);
        const employees = empRes.data || [];
        const attendance = attRes.data || [];
        const leave = leaveRes.data || [];
        const ann = annRes.data || [];
        setStats({
          employees: employees.filter((e: { status: string }) => e.status === "active").length,
          presentToday: attendance.filter((a: { status: string }) => a.status === "present").length,
          onLeave: employees.filter((e: { status: string }) => e.status === "on-leave").length,
          pendingLeave: leave.length,
        });
        setAnnouncements(ann.slice(0, 3));
      } catch { /* fail silently */ }
    };
    fetchAll();
  }, [today]);

  const cards = [
    { label: "Active Employees", value: stats.employees, icon: Users, color: "bg-blue-500", href: "/dashboard/employees" },
    { label: "Present Today", value: stats.presentToday, icon: Clock, color: "bg-green-500", href: "/dashboard/attendance" },
    { label: "On Leave", value: stats.onLeave, icon: CalendarOff, color: "bg-orange-500", href: "/dashboard/leave" },
    { label: "Pending Approvals", value: stats.pendingLeave, icon: CheckCircle, color: "bg-purple-500", href: "/dashboard/leave/approvals" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-blue-300 transition-colors">
            <div className={`p-3 rounded-xl ${color}`}><Icon className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {announcements.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Latest Announcements</h2>
            </div>
            <Link href="/dashboard/announcements" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="border-l-2 border-blue-200 pl-3">
                <p className="text-sm font-medium text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
