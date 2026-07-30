import { useEffect, useState, ReactNode } from "react";
import { useDashboardContext } from "../../context/DashboardContext";
import { usePermissionsContext } from "../../context/PermissionsContext";
import { SplashScreen } from "../layout/SplashScreen";

const MIN_SPLASH_MS = 1200;
const FADE_MS = 500;

/**
 * The second half of the launch splash (see AuthGate for the first half,
 * "Signing in…") — mounted only once login has already succeeded and the
 * data providers (DashboardProvider, PermissionsProvider) are live, so it
 * can track their loading state directly. Shows "Loading dashboard data…"
 * then "Almost ready…" and dismisses once the stat numbers AND the
 * permissions probe have both settled (success or failure — a data-fetch
 * failure here still reveals the app, landing on DashboardScreen's own
 * "Session expired / Retry" UI rather than bouncing back to the Login
 * screen; login itself did succeed, this is a separate, already-handled
 * failure mode). Waiting on permissions here — rather than letting them
 * finish in the background after reveal — is what makes the permission
 * probe "no extra delay": it's covered by the same wait the dashboard's
 * own data already needed, not an additional one, and it means the
 * Sidebar/Dashboard never render in a "permissions unknown yet" state.
 */
export function DashboardSplashGate({ children }: { children: ReactNode }) {
  const { error, totalStudents, totalApplications } = useDashboardContext();
  const { loading: permissionsLoading } = usePermissionsContext();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const statsLoaded = totalStudents !== null && totalApplications !== null;
  const dataSettled = (statsLoaded || error !== null) && !permissionsLoading;
  const ready = minTimeElapsed && dataSettled;

  useEffect(() => {
    if (!ready || fadingOut) return;
    setFadingOut(true);
    const timer = setTimeout(() => setDismissed(true), FADE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      {children}
      {!dismissed && <SplashScreen fadingOut={fadingOut} phase={statsLoaded ? "almost-ready" : "loading-data"} />}
    </>
  );
}
