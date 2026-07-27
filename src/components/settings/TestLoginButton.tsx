import { useState } from "react";
import { testLogin } from "../../lib/tauri";

export function TestLoginButton() {
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "failure">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("checking");
    setMessage(null);
    try {
      const result = await testLogin();
      setStatus(result.success ? "success" : "failure");
      setMessage(result.message);
    } catch (e) {
      setStatus("failure");
      setMessage(String(e));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "checking"}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-white/5 disabled:opacity-50"
      >
        {status === "checking" ? "Testing…" : "Test Login"}
      </button>
      {message && (
        <p className={`text-sm ${status === "success" ? "text-success" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
