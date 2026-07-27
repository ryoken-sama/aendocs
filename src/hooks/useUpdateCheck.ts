import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

/** Silently checks for an update once per app launch. Dismissing the result
 * just clears local state — since this only runs once on mount, it
 * naturally doesn't ask again until the app is restarted. */
export function useUpdateCheck() {
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    let cancelled = false;
    check()
      .then((result) => {
        if (!cancelled && result?.available) {
          setUpdate(result);
        }
      })
      .catch(() => {
        // A failed check should never interrupt the app — fail silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { update, dismiss: () => setUpdate(null) };
}
