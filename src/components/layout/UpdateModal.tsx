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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Update available — install now?
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={installing}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {installing ? "Installing…" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
