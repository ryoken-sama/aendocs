const columns: { key: string; label: string; barWidth: string }[] = [
  { key: "name", label: "Name", barWidth: "w-32" },
  { key: "id", label: "ID", barWidth: "w-14" },
  { key: "branch", label: "Branch", barWidth: "w-24" },
  { key: "country", label: "Country", barWidth: "w-20" },
  { key: "university", label: "University", barWidth: "w-40" },
  { key: "program", label: "Program", barWidth: "w-36" },
  { key: "status", label: "Status", barWidth: "w-20" },
];

const SKELETON_ROW_COUNT = 10;

/** Shown in place of ResultsTable while the first page of a newly-selected
 * section is loading — same header/columns as the real table so the layout
 * doesn't jump once data arrives, with animated placeholder bars standing
 * in for each cell (a rounded pill for Status, echoing StatusPill). */
export function ResultsTableSkeleton() {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 text-left font-medium text-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  <div
                    className={`h-4 animate-pulse rounded bg-border ${col.barWidth} ${
                      col.key === "status" ? "rounded-full" : ""
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
