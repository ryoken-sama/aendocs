import type { StudentListEntry } from "../../types";
import { useAppContext } from "../../context/AppContext";

interface StudentsListResultsTableProps {
  students: StudentListEntry[];
}

const columns: { key: keyof StudentListEntry; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "branch", label: "Branch" },
  { key: "country", label: "Country" },
  { key: "visa_status", label: "Visa Status" },
  { key: "counselor", label: "Counselor" },
];

export function StudentsListResultsTable({ students }: StudentsListResultsTableProps) {
  const { goToStudentDetail } = useAppContext();

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
              onClick={() => goToStudentDetail(student)}
              className="cursor-pointer hover:bg-white/5"
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
