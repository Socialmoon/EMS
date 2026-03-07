"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export type Role = "admin" | "hr" | "manager" | "employee";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Read role from custom claims (token) — fastest source
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const claimRole = idTokenResult.claims.role as Role | undefined;

        if (claimRole) {
          setRole(claimRole);
        } else {
          // Fallback: read from Firestore /users doc
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setRole((snap.data()?.role as Role) ?? "employee");
        }

        // Sync session cookie for middleware
        const token = await firebaseUser.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
        // Clear session cookie
        await fetch("/api/auth/session", { method: "DELETE" });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
