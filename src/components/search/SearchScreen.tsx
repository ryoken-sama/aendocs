import { useMemo } from "react";
import { useStudentsContext } from "../../context/StudentsContext";
import { useFilterOptions } from "../../hooks/useFilterOptions";
import type { StudentSummary } from "../../types";
import { SearchBar } from "./SearchBar";
import { ResultsTable } from "./ResultsTable";
import { FilterBar, type StudentFilters } from "./FilterBar";

const DISPLAY_PAGE_SIZE = 25;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter((v) => v !== ""))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function matchesQuery(student: StudentSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    student.name.toLowerCase().includes(q) ||
    student.application_id.toLowerCase().includes(q) ||
    student.branch.toLowerCase().includes(q) ||
    student.country.toLowerCase().includes(q) ||
    student.university.toLowerCase().includes(q) ||
    student.program.toLowerCase().includes(q) ||
    student.status.toLowerCase().includes(q)
  );
}

export function SearchScreen() {
  const {
    students,
    loadedCount,
    totalCount,
    backgroundLoading,
    error,
    refresh,
    serverFilters,
    setServerFilters,
    status,
    setStatus,
    query,
    setQuery,
    page,
    setPage,
  } = useStudentsContext();

  const { options: filterOptionSource } = useFilterOptions();

  // Branch/Agent/Country/Institution are already applied server-side (baked
  // into `students`), so only Status options need deriving from what's
  // actually loaded — the id->name lists for the other four come straight
  // from the /offerapplications page fetched once via useFilterOptions.
  const statusOptions = useMemo(() => uniqueSorted(students.map((s) => s.status)), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => matchesQuery(s, query) && (!status || s.status === status));
  }, [students, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / DISPLAY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStudents = filteredStudents.slice(
    currentPage * DISPLAY_PAGE_SIZE,
    (currentPage + 1) * DISPLAY_PAGE_SIZE,
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(0);
  }

  function handleFilterChange(field: keyof StudentFilters, value: string) {
    if (field === "status") {
      setStatus(value);
    } else {
      setServerFilters((prev) => ({ ...prev, [field]: value }));
    }
    setPage(0);
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Student Search</h2>
      <div className="mt-4">
        <SearchBar value={query} onChange={handleQueryChange} />
      </div>

      <FilterBar
        options={{ ...filterOptionSource, status: statusOptions }}
        filters={{ ...serverFilters, status }}
        onChange={handleFilterChange}
      />

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <span>
          {backgroundLoading
            ? `Loading… ${loadedCount}/${totalCount ?? "?"} records`
            : totalCount !== null
              ? `${totalCount} record${totalCount === 1 ? "" : "s"} loaded`
              : "Loading…"}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={backgroundLoading}
          title="Refresh records"
          aria-label="Refresh records"
          className="rounded-full p-0.5 leading-none text-muted hover:bg-white/5 hover:text-ink disabled:opacity-50"
        >
          <span aria-hidden="true" className={backgroundLoading ? "inline-block animate-spin" : "inline-block"}>
            ↻
          </span>
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {!error && <ResultsTable students={pageStudents} />}

      {!error && filteredStudents.length > DISPLAY_PAGE_SIZE && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-ink hover:bg-white/5 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage + 1 >= totalPages}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-ink hover:bg-white/5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
