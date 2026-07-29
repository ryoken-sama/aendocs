import { useEffect, useState, ReactNode } from "react";
import { useAppContext } from "../../context/AppContext";
import { useDashboardContext } from "../../context/DashboardContext";
import { getUserProfile } from "../../lib/tauri";
import { SplashScreen, type SplashPhase } from "./SplashScreen";

const MIN_SPLASH_MS = 1500;
const FADE_MS = 500;
// A short, purely cosmetic beat between "connecting" and "verifying" —
// both genuinely describe the same in-flight session check below, which
// has no observable sub-steps of its own to key text off of.
const VERIFYING_DELAY_MS = 350;

/**
 * Gates the real app behind a full-screen branded splash on launch. The
 * real app (children) is mounted underneath the whole time — that's what
 * lets session establishment and the dashboard's parallel fetches (both
 * driven by DashboardProvider, which must sit above this in the tree)
 * actually run in the background while the splash is up — but the splash
 * is an opaque full-screen overlay, so nothing partial is ever visible.
 *
 * Phase text tracks two genuinely separate real events:
 * - getUserProfile() resolving is a dedicated, lightweight session-check
 *   signal — it calls ensure_logged_in() same as everything else, but
 *   resolves independently of (and much faster than) waiting on the
 *   entire dashboard fetch batch. Success advances to "loading-data";
 *   failure is handled by the existing error-driven redirect below.
 * - DashboardContext's stat numbers loading (totalStudents AND
 *   totalApplications, the values the 4 stat cards need) advances to
 *   "almost-ready". Both stay non-null forever once first set — even
 *   through a later background refetch — so this is a stable "loaded"
 *   signal, not one that flickers back to false.
 *
 * Dismissal requires at least MIN_SPLASH_MS elapsed (so it never just
 * flashes by) AND the session check having resolved one way or the other.
 * On a failed session check, this redirects to Settings before revealing
 * the app — there's no point showing a broken Dashboard.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const { goToSettings } = useAppContext();
  const { error: dashboardError, totalStudents, totalApplications } = useDashboardContext();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("connecting");
  const [sessionFailed, setSessionFailed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPhase((p) => (p === "connecting" ? "verifying" : p)), VERIFYING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then(() => {
        if (cancelled) return;
        setPhase((p) => (p === "almost-ready" ? p : "loading-data"));
      })
      .catch(() => {
        if (!cancelled) setSessionFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (totalStudents !== null && totalApplications !== null) {
      setPhase("almost-ready");
    }
  }, [totalStudents, totalApplications]);

  const overallFailed = sessionFailed || dashboardError !== null;
  const statsLoaded = totalStudents !== null && totalApplications !== null;
  const sessionCheckComplete = overallFailed || statsLoaded;
  const ready = minTimeElapsed && sessionCheckComplete;

  useEffect(() => {
    if (!ready || fadingOut) return;
    if (overallFailed) {
      goToSettings();
    }
    setFadingOut(true);
    const timer = setTimeout(() => setDismissed(true), FADE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      {children}
      {!dismissed && <SplashScreen fadingOut={fadingOut} phase={phase} />}
    </>
  );
}
