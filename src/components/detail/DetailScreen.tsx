import { useEffect, useState } from "react";
import { getChecklist, getStudentDetail } from "../../lib/tauri";
import { useAppContext } from "../../context/AppContext";
import type { DocRequirementStatus, DownloadSummary, StudentDetail } from "../../types";
import { StudentInfoCard } from "./StudentInfoCard";
import { ChecklistGrid } from "./ChecklistGrid";
import { DownloadActionPanel } from "./DownloadActionPanel";

export function DetailScreen({ studentId }: { studentId: string }) {
  const { goToSearch } = useAppContext();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [checklist, setChecklist] = useState<DocRequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStudentDetail(studentId)
      .then(async (d) => {
        if (cancelled) return;
        setDetail(d);
        const presentCategories = d.documents.filter((doc) => doc.present).map((doc) => doc.label);
        const items = await getChecklist(d.university, presentCategories);
        if (cancelled) return;
        setChecklist(items);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  function handleDownloadComplete(summary: DownloadSummary) {
    // The download pipeline recomputed the checklist against what's actually
    // on disk now; reflect it here without a full re-fetch. "not_required"
    // entries are unaffected by a download and are left as-is.
    setChecklist((prev) =>
      prev.map((item) =>
        item.status === "not_required"
          ? item
          : {
              ...item,
              status: summary.missing_categories.includes(item.category) ? "missing" : "present",
            },
      ),
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <button onClick={goToSearch} className="text-sm text-blue-600 hover:underline">
        ← Back to Search
      </button>

      <h2 className="mt-3 text-xl font-semibold">Student Detail</h2>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && detail && (
        <div className="mt-4 flex flex-col gap-6">
          <StudentInfoCard detail={detail} />
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-500">Document Checklist</h3>
            <ChecklistGrid items={checklist} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-500">Download &amp; Organise</h3>
            <DownloadActionPanel detail={detail} onDownloadComplete={handleDownloadComplete} />
          </div>
        </div>
      )}
    </div>
  );
}
