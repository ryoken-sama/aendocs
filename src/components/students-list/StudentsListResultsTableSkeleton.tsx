const columns: { key: string; label: string; barWidth: string }[] = [
  { key: "name", label: "Name", barWidth: "w-32" },
  { key: "email", label: "Email", barWidth: "w-36" },
  { key: "mobile", label: "Mobile", barWidth: "w-24" },
  { key: "branch", label: "Branch", barWidth: "w-24" },
  { key: "country", label: "Country", barWidth: "w-20" },
  { key: "visa_status", label: "Visa Status", barWidth: "w-20" },
  { key: "counselor", label: "Counselor", barWidth: "w-28" },
];

const SKELETON_ROW_COUNT = 10;

/** Shown in place of StudentsListResultsTable while a page is loading —
 * same header/columns as the real table, animated placeholder bars per
 * cell. Mirrors ResultsTableSkeleton in ../search. */
export function StudentsListResultsTableSkeleton() {
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
                  <div className={`h-4 animate-pulse rounded bg-border ${col.barWidth}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
