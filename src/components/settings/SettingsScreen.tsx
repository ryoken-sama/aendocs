import { useState } from "react";
import { useOutputFolder } from "../../hooks/useOutputFolder";
import { FolderPicker } from "./FolderPicker";
import { ThemeToggle } from "./ThemeToggle";
import { BackButton } from "../layout/BackButton";
import { useThemeContext } from "../../context/ThemeContext";
import { useUpdateContext } from "../../context/UpdateContext";
import { useAuthContext } from "../../context/AuthContext";
import { changeAccount } from "../../lib/tauri";

export function SettingsScreen() {
  const { outputFolder, setOutputFolder, loading, saving, error, save } = useOutputFolder();
  const { darkMode, setDarkMode } = useThemeContext();
  const { appVersion, checking, checkResult, checkNow } = useUpdateContext();
  const { signOut } = useAuthContext();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [changingAccount, setChangingAccount] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMessage(null);
    try {
      await save();
      setSavedMessage("Settings saved.");
    } catch {
      // error is surfaced via the `error` state from useOutputFolder
    }
  }

  async function handleChangeAccount() {
    setChangingAccount(true);
    try {
      await changeAccount();
    } catch {
      // best effort — sign out locally regardless, same convention as logout
    } finally {
      signOut();
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
        <button
          type="button"
          onClick={checkNow}
          disabled={checking}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-white/5 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check for Updates"}
        </button>

        {checkResult?.type === "up-to-date" && (
          <p className="mt-2 text-sm text-success">You&apos;re on the latest version (v{checkResult.version}).</p>
        )}
        {checkResult?.type === "error" && (
          <p className="mt-2 text-sm text-red-400">Could not check for updates. Please check your connection.</p>
        )}

        {appVersion && <p className="mt-3 text-xs text-muted">Version {appVersion}</p>}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <button
          type="button"
          onClick={handleChangeAccount}
          disabled={changingAccount}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-white/5 disabled:opacity-50"
        >
          {changingAccount ? "Signing out…" : "Change Account"}
        </button>
        <p className="mt-2 text-xs text-muted">Signs you out and forgets any saved credentials on this device.</p>
      </div>
    </div>
  );
}
