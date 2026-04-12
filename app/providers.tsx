"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (id?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem("admin_auth");
    if (savedAuth === "true") {
      setUser({ uid: "admin", email: "admin@premia.shop", displayName: "Administrator", photoURL: null });
    }
    setLoading(false);
  }, []);

  const signIn = async (id?: string, password?: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (id === "admin" && password === "123123123") {
      localStorage.setItem("admin_auth", "true");
      setUser({ uid: "admin", email: "admin@premia.shop", displayName: "Administrator", photoURL: null });
    } else {
      throw new Error("Invalid ID or password");
    }
  };

  const signOut = async () => {
    localStorage.removeItem("admin_auth");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}