"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  Calendar,
  DollarSign,
  Star,
  FileText,
  Megaphone,
  Bell,
  BarChart2,
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/dashboard/employees", icon: Users },
  { label: "Departments", href: "/dashboard/departments", icon: Building2 },
  { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { label: "Leave", href: "/dashboard/leave", icon: Calendar },
  { label: "Payroll", href: "/dashboard/payroll", icon: DollarSign },
  { label: "Performance", href: "/dashboard/performance", icon: Star },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-gray-700">
        <span className="font-bold text-white tracking-wide">EMS</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {nav.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
