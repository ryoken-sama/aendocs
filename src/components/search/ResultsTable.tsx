import type { StudentSummary } from "../../types";
import { useAppContext } from "../../context/AppContext";

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
];

export function ResultsTable({ students }: ResultsTableProps) {
  const { goToDetail } = useAppContext();

  if (students.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No students found.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 text-left font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => goToDetail(student.id)}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {student[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
