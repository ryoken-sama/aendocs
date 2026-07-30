import { useEffect, useState, ReactNode } from "react";
import { autoLogin } from "../../lib/tauri";
import { AuthProvider } from "../../context/AuthContext";
import { AppProvider } from "../../context/AppContext";
import { StudentsProvider } from "../../context/StudentsContext";
import { StudentListProvider } from "../../context/StudentListContext";
import { PermissionsProvider } from "../../context/PermissionsContext";
import { DashboardProvider } from "../../context/DashboardContext";
import { UpdateProvider } from "../../context/UpdateContext";
import { SplashScreen } from "../layout/SplashScreen";
import { LoginScreen } from "./LoginScreen";
import { DashboardSplashGate } from "./DashboardSplashGate";

type Status =
  | { name: "checking" }
  | { name: "login"; error: string | null }
  | { name: "authenticated" };

/**
 * Locks the whole app behind login. Nothing in `children` — and none of
 * the data providers (StudentsProvider/StudentListProvider/
 * DashboardProvider) — mounts until a login has actually succeeded, which
 * is what eliminates the old race where the dashboard's fetches could fire
 * before/without a session. Three states:
 *
 * - "checking": running `autoLogin()` (reads the keyring for a
 *   "remembered" account and, if found, logs in silently) — shown as the
 *   same splash used everywhere else. If nothing is saved, this resolves
 *   near-instantly (one local settings + keyring read, no network) and
 *   falls through to the Login screen; if a saved account IS found, the
 *   splash stays up for the real network login.
 * - "login": the full-screen Login form, optionally pre-seeded with an
 *   error (auto-login's "Session expired…", or nothing on first launch).
 * - "authenticated": mounts the real app — the data providers (including
 *   PermissionsProvider, which probes every endpoint's accessibility once
 *   here, in parallel with the dashboard's own fetches — see
 *   PermissionsContext), then DashboardSplashGate (which takes over the
 *   same splash for "Loading dashboard data…"/"Almost ready…", and waits
 *   on permissions settling too), then `children`.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ name: "checking" });

  useEffect(() => {
    if (status.name !== "checking") return;
    let cancelled = false;
    autoLogin()
      .then((result) => {
        if (cancelled) return;
        if (result === null) {
          setStatus({ name: "login", error: null });
        } else if (result.success) {
          setStatus({ name: "authenticated" });
        } else {
          setStatus({ name: "login", error: result.message });
        }
      })
      .catch((e) => {
        if (!cancelled) setStatus({ name: "login", error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [status.name]);

  if (status.name === "checking") {
    return <SplashScreen phase="signing-in" fadingOut={false} />;
  }

  if (status.name === "login") {
    return <LoginScreen initialError={status.error} onSuccess={() => setStatus({ name: "authenticated" })} />;
  }

  return (
    <AppProvider>
      <StudentsProvider>
        <StudentListProvider>
          <PermissionsProvider>
            <DashboardProvider>
              <UpdateProvider>
                <AuthProvider signOut={() => setStatus({ name: "login", error: null })}>
                  <DashboardSplashGate>{children}</DashboardSplashGate>
                </AuthProvider>
              </UpdateProvider>
            </DashboardProvider>
          </PermissionsProvider>
        </StudentListProvider>
      </StudentsProvider>
    </AppProvider>
  );
}
