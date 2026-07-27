import type { StudentSummary } from "../../types";
import { StatusPill } from "../layout/StatusPill";

export function StudentInfoCard({ student }: { student: StudentSummary }) {
  const rows: [string, string][] = [
    ["Branch", student.branch],
    ["Country", student.country],
    ["University", student.university],
    ["Program", student.program],
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{student.name}</h3>
        {student.status && <StatusPill status={student.status} />}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="text-ink">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
