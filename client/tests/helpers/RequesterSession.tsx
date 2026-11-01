import type { ReactNode } from "react";
import { AuthContext } from "../../src/auth/AuthContext";

export const requester = {
  id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.ac.th",
  role: "REQUESTER" as const, mustChangePassword: false,
};

export function RequesterSession({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{
    user: requester, loading: false,
    login: async () => requester, logout: async () => {}, refreshUser: async () => requester,
  }}>{children}</AuthContext.Provider>;
}
