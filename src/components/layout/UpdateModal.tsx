import { useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";

interface UpdateModalProps {
  update: Update;
  onDismiss: () => void;
}

export function UpdateModal({ update, onDismiss }: UpdateModalProps) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInstall() {
    setInstalling(true);
    setError(null);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (e) {
      setError(String(e));
      setInstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <p className="text-base font-semibold text-ink">Update available — install now?</p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={installing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 disabled:opacity-50"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink hover:bg-primary-dark disabled:opacity-50"
          >
            {installing ? "Installing…" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
