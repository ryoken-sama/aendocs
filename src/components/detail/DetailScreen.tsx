import { useEffect, useMemo, useState } from "react";
import { getStudentDetail } from "../../lib/tauri";
import { useDocumentCategories } from "../../hooks/useDocumentCategories";
import type { DetailDocEntry, StudentSummary } from "../../types";
import { StudentInfoCard } from "./StudentInfoCard";
import { DocumentList } from "./DocumentList";
import { DownloadActionPanel } from "./DownloadActionPanel";
import { BackButton } from "../layout/BackButton";

export function DetailScreen({ student }: { student: StudentSummary }) {
  const { categories: categoryOptions } = useDocumentCategories(student.country);
  const [documents, setDocuments] = useState<DetailDocEntry[]>([]);
  // Keyed by the document's URL-derived filename (the key shared with ZIP
  // entries at download time) — never by display name, which the ZIP
  // doesn't carry at all.
  const [categories, setCategories] = useState<Record<string, string>>({});
  // Keyed the same way — the free-text name typed while a document's
  // category is set to "Manually Rename".
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStudentDetail(student.id)
      .then((d) => {
        if (cancelled) return;
        setDocuments(d.documents);
        setCategories(
          Object.fromEntries(
            d.documents.map((doc) => [doc.filename, doc.suggested_category ?? "Manually Rename"]),
          ),
        );
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
  }, [student.id]);

  function handleCategoryChange(filename: string, category: string) {
    setCategories((prev) => ({ ...prev, [filename]: category }));
  }

  function handleCustomNameChange(filename: string, value: string) {
    setCustomNames((prev) => ({ ...prev, [filename]: value }));
  }

  // What actually gets sent to download_and_organize: a typed custom name
  // takes over from the "Manually Rename" sentinel once staff have entered
  // one — an empty custom name still means "leave unrenamed" (see
  // download.rs's handling of the sentinel/empty-string cases).
  const categoryOverrides = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const [filename, category] of Object.entries(categories)) {
      if (category === "Manually Rename") {
        merged[filename] = customNames[filename]?.trim() || "Manually Rename";
      } else {
        merged[filename] = category;
      }
    }
    return merged;
  }, [categories, customNames]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <BackButton />

      <h2 className="mt-3 text-xl font-semibold">Student Detail</h2>

      <div className="mt-4 flex flex-col gap-6">
        <StudentInfoCard student={student} />

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Documents</h3>
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <DocumentList
              documents={documents}
              categories={categories}
              customNames={customNames}
              categoryOptions={categoryOptions}
              onCategoryChange={handleCategoryChange}
              onCustomNameChange={handleCustomNameChange}
            />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Download &amp; Organise</h3>
          <DownloadActionPanel student={student} categoryOverrides={categoryOverrides} />
        </div>
      </div>
    </div>
  );
}
