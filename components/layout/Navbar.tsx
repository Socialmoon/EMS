"use client";

import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, role } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={16} />
          <span>{user?.displayName ?? user?.email}</span>
          {role && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 capitalize">
              {role}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
}
