import { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { FolderPicker } from "./FolderPicker";
import { TestLoginButton } from "./TestLoginButton";
import { ThemeToggle } from "./ThemeToggle";
import { BackButton } from "../layout/BackButton";
import { useThemeContext } from "../../context/ThemeContext";

export function SettingsScreen() {
  const { email, setEmail, outputFolder, setOutputFolder, loading, saving, error, save } =
    useSettings();
  const { darkMode, setDarkMode } = useThemeContext();
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
        <p className="mt-4 text-sm text-muted">Loading settings…</p>
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
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary"
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
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary"
            placeholder="Leave blank to keep the saved password"
            autoComplete="new-password"
          />
          <span className="text-xs text-muted">
            Stored securely in Windows Credential Manager — never written to disk.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Output folder</span>
          <FolderPicker value={outputFolder} onChange={setOutputFolder} />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {savedMessage && <p className="text-sm text-success">{savedMessage}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <span className="text-sm font-medium">Dark Mode</span>
        <ThemeToggle checked={darkMode} onChange={setDarkMode} />
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <TestLoginButton />
      </div>
    </div>
  );
}
