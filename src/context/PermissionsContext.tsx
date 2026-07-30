import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getPermissions } from "../lib/tauri";
import type { PermissionKey, PermissionsMap } from "../types";

interface PermissionsContextValue {
  /** `null` until the probe resolves (success or failure) — see `can`. */
  permissions: PermissionsMap | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Whether the current account can access the given endpoint. Fails
   * *open* (returns true) while `permissions` is still `null` — loading or
   * errored — since a probing hiccup shouldn't be able to hide the whole
   * app; once a real map has loaded, an explicit `false`/missing key means
   * genuinely denied. In practice this ambiguity window is invisible:
   * DashboardSplashGate keeps the launch splash up until permissions have
   * settled one way or another, same as the rest of the dashboard's data,
   * so nothing gated by `can` renders before that. */
  can: (key: PermissionKey) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/**
 * Probes every endpoint's accessibility once per login (see
 * `permissions.rs`) and exposes the result to the Dashboard (which
 * endpoints) and Sidebar (which nav items) — both gate their own rendering
 * off `can()`. Mounted alongside the other data providers (see AuthGate),
 * so this fires in parallel with the dashboard's own fetches, not after
 * them.
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPermissions()
      .then((result) => {
        if (!cancelled) setPermissions(result);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const can = useCallback((key: PermissionKey) => (permissions ? permissions[key] === true : true), [permissions]);

  const value = useMemo<PermissionsContextValue>(
    () => ({ permissions, loading, error, refresh, can }),
    [permissions, loading, error, refresh, can],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissionsContext(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissionsContext must be used within PermissionsProvider");
  return ctx;
}
