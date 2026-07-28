import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";

type CheckResult = { type: "up-to-date"; version: string } | { type: "error" };

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
        if (!cancelled && result?.available) {
          setUpdate(result);
        }
      })
      .catch(() => {
        // A failed silent check should never interrupt the app.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkNow = useCallback(async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await check();
      if (result?.available) {
        setUpdate(result);
      } else {
        const version = appVersion ?? (await getVersion());
        setCheckResult({ type: "up-to-date", version });
      }
    } catch {
      setCheckResult({ type: "error" });
    } finally {
      setChecking(false);
    }
  }, [appVersion]);

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
