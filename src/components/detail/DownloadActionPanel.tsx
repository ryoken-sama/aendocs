import { useState } from "react";
import { downloadAndOrganize } from "../../lib/tauri";
import type { DownloadSummary, StudentSummary } from "../../types";

interface DownloadActionPanelProps {
  student: StudentSummary;
  categoryOverrides: Record<string, string>;
}

export function DownloadActionPanel({ student, categoryOverrides }: DownloadActionPanelProps) {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<DownloadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    setSummary(null);
    try {
      const result = await downloadAndOrganize(student, categoryOverrides);
      setSummary(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {running ? "Downloading…" : "Download & Organise"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {summary && (
        <p className="mt-2 text-sm text-green-600">
          {summary.files_written} file(s) saved to {summary.output_path}
        </p>
      )}
    </div>
  );
}
