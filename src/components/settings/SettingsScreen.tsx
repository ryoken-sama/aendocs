import { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { FolderPicker } from "./FolderPicker";
import { TestLoginButton } from "./TestLoginButton";
import { BackButton } from "../layout/BackButton";

export function SettingsScreen() {
  const { email, setEmail, outputFolder, setOutputFolder, loading, saving, error, save } =
    useSettings();
  const [password, setPassword] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMessage(null);
    try {
      await save(password || undefined);
      setPassword("");
      setSavedMessage("Settings saved.");
    } catch {
      // error is surfaced via the `error` state from useSettings
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <BackButton />
        <p className="mt-4 text-sm text-slate-500">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <BackButton />
      <h2 className="mt-3 text-xl font-semibold">Settings</h2>
      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">aenapply.com email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="you@aen.edu"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Leave blank to keep the saved password"
            autoComplete="new-password"
          />
          <span className="text-xs text-slate-500">
            Stored securely in Windows Credential Manager — never written to disk.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Output folder</span>
          <FolderPicker value={outputFolder} onChange={setOutputFolder} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="text-sm text-green-600">{savedMessage}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <TestLoginButton />
      </div>
    </div>
  );
}
