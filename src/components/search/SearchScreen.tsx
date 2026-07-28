import { useStudentsContext } from "../../context/StudentsContext";
import { useFilterOptions } from "../../hooks/useFilterOptions";
import { SECTIONS } from "../../constants";
import { ResultsTable } from "./ResultsTable";
import { ResultsTableSkeleton } from "./ResultsTableSkeleton";
import { FilterBar, type StudentFilters } from "./FilterBar";
import { Paginator } from "./Paginator";

export function SearchScreen() {
  const {
    activeSection,
    students,
    totalCount,
    totalPages,
    loading,
    error,
    refresh,
    serverFilters,
    setServerFilters,
    page,
    setPage,
  } = useStudentsContext();

  const { options: filterOptionSource } = useFilterOptions();
  const sectionLabel = SECTIONS.find((s) => s.key === activeSection)?.label ?? "";

  function handleFilterChange(field: keyof StudentFilters, value: string) {
    setServerFilters((prev) => ({ ...prev, [field]: value }));
    setPage(0);
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">{sectionLabel}</h2>

      <div className="mt-4">
        <FilterBar options={filterOptionSource} filters={serverFilters} onChange={handleFilterChange} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <span>
          {loading
            ? "Loading…"
            : totalCount !== null
              ? `${totalCount} total record${totalCount === 1 ? "" : "s"}`
              : ""}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh"
          className="rounded-full p-0.5 leading-none text-muted hover:bg-white/5 hover:text-ink disabled:opacity-50"
        >
          <span aria-hidden="true" className={loading ? "inline-block animate-spin" : "inline-block"}>
            ↻
          </span>
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {!error && (loading ? <ResultsTableSkeleton /> : <ResultsTable students={students} />)}

      {!error && <Paginator page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />}
    </div>
  );
}
