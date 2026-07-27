import type { StudentSummary } from "../../types";

export function StudentInfoCard({ student }: { student: StudentSummary }) {
  const rows: [string, string][] = [
    ["Branch", student.branch],
    ["Country", student.country],
    ["University", student.university],
    ["Program", student.program],
  ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-semibold">{student.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
