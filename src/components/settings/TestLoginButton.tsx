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
        className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        {status === "checking" ? "Testing…" : "Test Login"}
      </button>
      {message && (
        <p className={`text-sm ${status === "success" ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
