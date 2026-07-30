import { createContext, useContext, ReactNode } from "react";

interface AuthContextValue {
  /** Tears down the authenticated app and returns to the Login screen —
   * call after the backend's own logout/change-account command completes
   * (or fails; the local UI should reset either way, same as the existing
   * "best effort" logout convention). Unmounting the provider tree this
   * sits inside (see AuthGate) is what actually resets all app/session
   * state, so there's nothing else callers need to clean up themselves. */
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ signOut, children }: { signOut: () => void; children: ReactNode }) {
  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
