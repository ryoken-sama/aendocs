import { useCallback, useEffect, useState } from "react";
import { getSettings, saveOutputFolder } from "../lib/tauri";

/** The Settings screen's only remaining persisted field — email/password
 * moved to the Login screen, so this hook (unlike the old useSettings)
 * only ever reads/writes output_folder. */
export function useOutputFolder() {
  const [outputFolder, setOutputFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => setOutputFolder(settings.output_folder))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await saveOutputFolder(outputFolder);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [outputFolder]);

  return { outputFolder, setOutputFolder, loading, saving, error, save };
}
