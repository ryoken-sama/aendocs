import { useEffect, useState } from "react";
import { searchStudents } from "../../lib/tauri";
import { useDebounce } from "../../hooks/useDebounce";
import type { StudentSummary } from "../../types";
import { SearchBar } from "./SearchBar";
import { ResultsTable } from "./ResultsTable";

const PAGE_SIZE = 25;

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(0);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchStudents(debouncedQuery, page * PAGE_SIZE, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setStudents(result.students);
        setRecordsFiltered(result.records_filtered);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  const totalPages = Math.max(1, Math.ceil(recordsFiltered / PAGE_SIZE));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Student Search</h2>
      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">Searching…</p>}

      {!loading && !error && <ResultsTable students={students} />}

      {!loading && !error && recordsFiltered > PAGE_SIZE && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page + 1 >= totalPages}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
