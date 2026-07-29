import { useEffect, useState } from "react";
import { getStudentApplications } from "../../lib/tauri";
import { useAppContext } from "../../context/AppContext";
import type { StudentApplicationLink, StudentListEntry } from "../../types";
import { BackButton } from "../layout/BackButton";
import { StatusPill } from "../layout/StatusPill";

const INFO_ROWS: [string, keyof StudentListEntry][] = [
  ["Email", "email"],
  ["Mobile", "mobile"],
  ["Branch", "branch"],
  ["Country", "country"],
  ["Counselor", "counselor"],
];

/** The "Students" detail view — deliberately lighter than the Study Abroad
 * DetailScreen: just the student's basic profile plus a list of their
 * individual applications, no document list or Download & Organise (that
 * only makes sense once you're looking at one specific application). */
export function StudentDetailScreen({ student }: { student: StudentListEntry }) {
  const { goToDetail } = useAppContext();
  const [applications, setApplications] = useState<StudentApplicationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStudentApplications(student.students_id)
      .then((result) => {
        if (!cancelled) setApplications(result);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [student.students_id]);

  function handleOpenApplication(app: StudentApplicationLink) {
    goToDetail({
      id: app.id,
      students_id: student.students_id,
      application_id: app.application_id,
      name: student.name,
      branch: student.branch,
      country: app.country || student.country,
      university: app.university,
      program: app.program,
      status: app.status,
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <BackButton />

      <h2 className="mt-3 text-xl font-semibold">Student Detail</h2>

      <div className="mt-4 flex flex-col gap-6">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-lg font-semibold text-ink">{student.name}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {INFO_ROWS.map(([label, key]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="text-ink">{student[key] || "—"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted">Visa Status</dt>
              <dd className="mt-0.5">
                {student.visa_status ? <StatusPill status={student.visa_status} /> : <span className="text-ink">—</span>}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Applications</h3>
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && applications.length === 0 && (
            <p className="text-sm text-muted">No applications found.</p>
          )}
          {!loading && !error && applications.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <ul className="divide-y divide-border">
                {applications.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenApplication(app)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">
                          {app.application_id || `Application ${app.id}`}
                          {app.date && <span className="font-normal text-muted"> · {app.date}</span>}
                        </p>
                        <p className="mt-0.5 truncate text-muted">
                          {[app.university, app.program].filter(Boolean).join(" — ") || "—"}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {app.status && <StatusPill status={app.status} />}
                          {app.country && <span className="text-xs text-muted">{app.country}</span>}
                        </div>
                      </div>
                      <i className="ri-arrow-right-s-line shrink-0 text-muted" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
