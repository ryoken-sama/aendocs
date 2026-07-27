import type { StudentSummary } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { StatusPill } from "../layout/StatusPill";

interface ResultsTableProps {
  students: StudentSummary[];
}

const columns: { key: keyof StudentSummary; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "id", label: "ID" },
  { key: "branch", label: "Branch" },
  { key: "country", label: "Country" },
  { key: "university", label: "University" },
  { key: "program", label: "Program" },
  { key: "status", label: "Status" },
];

export function ResultsTable({ students }: ResultsTableProps) {
  const { goToDetail } = useAppContext();

  if (students.length === 0) {
    return <p className="mt-6 text-sm text-muted">No students found.</p>;
  }

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
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => goToDetail(student)}
              className="cursor-pointer hover:bg-white/5"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {col.key === "status" ? <StatusPill status={student.status} /> : student[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
