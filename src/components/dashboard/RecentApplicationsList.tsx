import { useAppContext } from "../../context/AppContext";
import { StatusPill } from "../layout/StatusPill";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import type { RecentApplication } from "../../types";

interface RecentApplicationsListProps {
  applications: RecentApplication[];
}

export function RecentApplicationsList({ applications }: RecentApplicationsListProps) {
  const { goToDetail } = useAppContext();

  if (applications.length === 0) {
    return <p className="text-sm text-muted">No recent applications.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {applications.map((app) => (
        <li key={app.student.id}>
          <button
            type="button"
            onClick={() => goToDetail(app.student)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{app.student.name}</p>
              <p className="truncate text-xs text-muted">{app.student.university || "—"}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <StatusPill status={app.student.status} />
              <span className="text-xs text-muted">{formatTimeAgo(app.updated_at)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
