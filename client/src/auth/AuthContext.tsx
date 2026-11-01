import React, { createContext, useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import type { AuthenticatedUser } from "../types/auth";

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthenticatedUser | null>;
}

export interface AuthError extends Error {
  code?: string;
  fields?: Record<string, string>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<AuthenticatedUser | null> => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    localStorage.removeItem("toktickit_requester_id");

    async function initAuth() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data && data.user) {
              setUser(data.user);
            } else {
              setUser(null);
            }
          }
        } else if (isMounted) {
          setUser(null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<AuthenticatedUser> => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err: AuthError = new Error(
        errorData.error?.message ||
          "Login failed. Please check your credentials.",
      );
      err.code = errorData.error?.code;
      err.fields = errorData.error?.fields;
      throw err;
    }

    const data = await res.json();
    localStorage.removeItem("toktickit_requester_id");
    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    const response = await apiFetch("/api/auth/logout", { method: "POST" });
    // A 401 confirms that the expired/invalid session is already unauthenticated.
    if (!response.ok && response.status !== 401) throw new Error("Unable to sign out. Please try again.");
    localStorage.removeItem("toktickit_requester_id");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth } from "./useAuth";
