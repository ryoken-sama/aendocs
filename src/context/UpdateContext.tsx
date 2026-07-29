import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { message } from "@tauri-apps/plugin-dialog";

type CheckResult = { type: "up-to-date"; version: string } | { type: "error" };

// tauri-plugin-updater has no distinct "no release available" error for a
// static endpoint like ours (a GitHub Releases URL). It only resolves
// cleanly to `null` on an HTTP 204, which GitHub's static file serving
// never returns — a missing/unpublished release 404s instead, and the
// plugin's Rust side collapses that into this exact message (see
// `remote_release.ok_or(Error::ReleaseNotFound)` in tauri-plugin-updater's
// updater.rs). So for this endpoint, this message means "no update" far
// more often than it means "something is actually broken."
const NO_RELEASE_AVAILABLE_MESSAGE = "Could not fetch a valid release JSON from the remote";

interface UpdateContextValue {
  update: Update | null;
  dismiss: () => void;
  appVersion: string | null;
  checking: boolean;
  checkResult: CheckResult | null;
  /** Manually triggers an update check (the Settings screen's "Check for
   * Updates" button) — shares `update` with the silent launch-time check
   * below, so a manually-found update opens the same modal instead of a
   * separate one. */
  checkNow: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVersion()
      .then((v) => {
        if (!cancelled) setAppVersion(v);
      })
      .catch(() => {
        // Version display is cosmetic — fail silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Silently checks for an update once per app launch. Dismissing just
  // clears local state — since this only runs once on mount, it naturally
  // doesn't ask again until the app is restarted.
  useEffect(() => {
    let cancelled = false;
    check()
      .then((result) => {
        console.log("[updater] launch check result:", result);
        if (!cancelled && result?.available) {
          setUpdate(result);
        }
      })
      .catch((e) => {
        // A failed silent check should never interrupt the app, but the
        // actual error is still worth seeing in the console.
        console.error("[updater] launch check failed:", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reportUpToDate = useCallback(async () => {
    const version = appVersion ?? (await getVersion());
    setCheckResult({ type: "up-to-date", version });
  }, [appVersion]);

  const checkNow = useCallback(async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await check();
      console.log("[updater] manual check result:", result);
      if (result?.available) {
        setUpdate(result);
      } else {
        await reportUpToDate();
      }
    } catch (e) {
      console.error("[updater] manual check failed:", e);
      if (String(e).includes(NO_RELEASE_AVAILABLE_MESSAGE)) {
        await reportUpToDate();
        return;
      }
      // A genuine failure — the Settings screen only ever shows the generic
      // "Could not check for updates" message, so surface the real error
      // via a native dialog (visible on both Linux and Windows) so it's
      // actually debuggable, not just the console (which isn't reachable
      // without devtools open).
      await message(String(e), { title: "Updater Error", kind: "error" });
      setCheckResult({ type: "error" });
    } finally {
      setChecking(false);
    }
  }, [reportUpToDate]);

  const value: UpdateContextValue = {
    update,
    dismiss: () => setUpdate(null),
    appVersion,
    checking,
    checkResult,
    checkNow,
  };

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdateContext(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdateContext must be used within UpdateProvider");
  return ctx;
}
