"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      const clean = msg.replace("Firebase: ", "").replace(/ \(auth\/.*\)/, "");
      if (
        clean.toLowerCase().includes("user-not-found") ||
        clean.toLowerCase().includes("wrong-password") ||
        clean.toLowerCase().includes("invalid-credential")
      ) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(clean);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">EMS Portal</h1>
              <p className="text-blue-200 text-xs">Employee Management System</p>
            </div>
          </div>
          <p className="text-sm text-blue-100">
            Sign in with your company credentials. Your dashboard will load based on your assigned role.
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-7 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 text-center mb-2.5">
              Access is granted based on your role
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-purple-50 text-purple-600">Admin</span>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600">HR</span>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-green-50 text-green-600">Manager</span>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-orange-50 text-orange-600">Employee</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 mt-4">
        Forgot your password?{" "}
        <a href="/reset-password" className="text-blue-500 hover:underline">
          Reset it here
        </a>{" "}
        or contact your administrator.
      </p>
    </div>
  );
}
