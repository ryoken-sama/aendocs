// Matches RECENT_LENGTH in DashboardContext.tsx.
const SKELETON_ROW_COUNT = 5;

export function RecentApplicationsListSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-border" />
            <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-border" />
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <div className="h-5 w-20 animate-pulse rounded-full bg-border" />
            <div className="h-3 w-16 animate-pulse rounded bg-border" />
          </div>
        </li>
      ))}
    </ul>
  );
}
