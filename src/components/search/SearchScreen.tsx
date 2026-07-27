import { useMemo, useState } from "react";
import { useAllStudents } from "../../hooks/useAllStudents";
import type { StudentSummary } from "../../types";
import { SearchBar } from "./SearchBar";
import { ResultsTable } from "./ResultsTable";
import { FilterBar, type StudentFilters } from "./FilterBar";

const DISPLAY_PAGE_SIZE = 25;
const EMPTY_FILTERS: StudentFilters = { branch: "", country: "", university: "", status: "" };

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
  const { students, loadedCount, totalCount, backgroundLoading, error } = useAllStudents();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<StudentFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const filterOptions = useMemo(
    () => ({
      branch: uniqueSorted(students.map((s) => s.branch)),
      country: uniqueSorted(students.map((s) => s.country)),
      university: uniqueSorted(students.map((s) => s.university)),
      status: uniqueSorted(students.map((s) => s.status)),
    }),
    [students],
  );

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        matchesQuery(s, query) &&
        (!filters.branch || s.branch === filters.branch) &&
        (!filters.country || s.country === filters.country) &&
        (!filters.university || s.university === filters.university) &&
        (!filters.status || s.status === filters.status),
    );
  }, [students, query, filters]);

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
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(0);
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Student Search</h2>
      <div className="mt-4">
        <SearchBar value={query} onChange={handleQueryChange} />
      </div>

      <FilterBar options={filterOptions} filters={filters} onChange={handleFilterChange} />

      <p className="mt-2 text-xs text-slate-500">
        {backgroundLoading
          ? `Loading… ${loadedCount}/${totalCount ?? "?"} records`
          : totalCount !== null
            ? `${totalCount} record${totalCount === 1 ? "" : "s"} loaded`
            : "Loading…"}
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!error && <ResultsTable students={pageStudents} />}

      {!error && filteredStudents.length > DISPLAY_PAGE_SIZE && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage + 1 >= totalPages}
            className="rounded-md bg-slate-200 px-3 py-1.5 font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
