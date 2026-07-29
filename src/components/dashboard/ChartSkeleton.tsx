const SKELETON_ROW_WIDTHS = ["70%", "55%", "85%", "40%", "62%"];

/** A loading placeholder shaped like HorizontalBarChart, for the dashboard's
 * "Applications by Status"/"Applications by Country" panels. */
export function ChartSkeleton() {
  return (
    <div className="flex h-[260px] flex-col justify-center gap-5 px-2">
      {SKELETON_ROW_WIDTHS.map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-16 flex-shrink-0 animate-pulse rounded bg-border" />
          <div className="h-4 animate-pulse rounded bg-border" style={{ width }} />
        </div>
      ))}
    </div>
  );
}
