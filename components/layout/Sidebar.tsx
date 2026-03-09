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
  Briefcase,
} from "lucide-react";
import { useAuth, Role } from "@/context/AuthContext";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
};

const nav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    roles: ["admin", "hr", "manager"],
  },
  {
    label: "Departments",
    href: "/dashboard/departments",
    icon: Building2,
    roles: ["admin", "hr", "manager"],
  },
  {
    label: "Positions",
    href: "/dashboard/positions",
    icon: Briefcase,
    roles: ["admin", "hr"],
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: Clock,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Leave",
    href: "/dashboard/leave",
    icon: Calendar,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    icon: DollarSign,
    roles: ["admin", "hr"],
  },
  {
    label: "Performance",
    href: "/dashboard/performance",
    icon: Star,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: Megaphone,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["admin", "hr", "manager", "employee"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart2,
    roles: ["admin", "hr"],
  },
];

const roleColors: Record<Role, string> = {
  admin: "bg-purple-500",
  hr: "bg-blue-500",
  manager: "bg-green-500",
  employee: "bg-orange-500",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const visibleNav = role ? nav.filter((item) => item.roles.includes(role)) : [];

  return (
    <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-700 gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          E
        </div>
        <span className="font-bold text-white tracking-wide">EMS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {visibleNav.map(({ label, href, icon: Icon }) => {
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

      {/* Role badge at bottom */}
      {role && (
        <div className="px-4 py-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${roleColors[role]}`} />
            <span className="text-xs text-gray-400 capitalize">{role} access</span>
          </div>
        </div>
      )}
    </aside>
  );
}
