import { useStudentListContext } from "../../context/StudentListContext";
import { StudentsListResultsTable } from "./StudentsListResultsTable";
import { StudentsListResultsTableSkeleton } from "./StudentsListResultsTableSkeleton";
import { Paginator } from "../search/Paginator";
import type { StudentsFilterSelection } from "../../types";

function filterHeading(filter: StudentsFilterSelection): string {
  switch (filter.type) {
    case "all":
      return "All Students";
    case "branch":
      return `Branch: ${filter.label}`;
    case "agent":
      return `Agent: ${filter.label}`;
    case "country":
      return `Country: ${filter.label}`;
  }
}

/** The "Students" sidebar group's list view — filtered by whichever item
 * was clicked in the sidebar (all / a specific branch / agent / country),
 * not by a FilterBar like the Study Abroad screen, since that selection
 * already fixes the one dimension that matters here. */
export function StudentsListScreen() {
  const { filter, students, totalCount, totalPages, loading, error, refresh, page, setPage } = useStudentListContext();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">{filterHeading(filter)}</h2>

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

      {!error && (loading ? <StudentsListResultsTableSkeleton /> : <StudentsListResultsTable students={students} />)}

      {!error && <Paginator page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />}
    </div>
  );
}
