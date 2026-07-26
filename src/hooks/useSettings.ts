import { useCallback, useEffect, useState } from "react";
import { getSettings, saveSettings } from "../lib/tauri";
import type { SettingsInput } from "../types";

export function useSettings() {
  const [email, setEmail] = useState("");
  const [outputFolder, setOutputFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setEmail(settings.email);
        setOutputFolder(settings.output_folder);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(
    async (password?: string) => {
      setSaving(true);
      setError(null);
      const input: SettingsInput = {
        email,
        output_folder: outputFolder,
        password: password || null,
      };
      try {
        await saveSettings(input);
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [email, outputFolder],
  );

  return {
    email,
    setEmail,
    outputFolder,
    setOutputFolder,
    loading,
    saving,
    error,
    save,
  };
}
