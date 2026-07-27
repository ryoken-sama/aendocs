import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { searchStudents } from "../lib/tauri";
import type { ServerFilters, StudentSummary } from "../types";

const INITIAL_LENGTH = 20;
const BACKGROUND_PAGE_LENGTH = 50;
const CONCURRENCY = 5;

const EMPTY_SERVER_FILTERS: ServerFilters = {
  branchId: "",
  agentId: "",
  countryId: "",
  institutionId: "",
};

interface StudentsContextValue {
  students: StudentSummary[];
  loadedCount: number;
  totalCount: number | null;
  backgroundLoading: boolean;
  error: string | null;
  /** Clears the cache and reloads every record from scratch. */
  refresh: () => void;

  serverFilters: ServerFilters;
  setServerFilters: (updater: ServerFilters | ((prev: ServerFilters) => ServerFilters)) => void;
  status: string;
  setStatus: (status: string) => void;
  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (updater: number | ((prev: number) => number)) => void;
}

const StudentsContext = createContext<StudentsContextValue | null>(null);

/**
 * Owns the search screen's loaded records plus its filters/query/page, at a
 * level above the screen switch in App.tsx — so navigating to a student's
 * detail page and back leaves this state untouched instead of remounting
 * SearchScreen and losing it.
 *
 * The progressive load (small first page, then background batches) re-runs
 * only when the server-side filters change or `refresh()` is called
 * explicitly (app launch is just the first run of this same effect) — never
 * as a side effect of navigating between screens.
 */
export function StudentsProvider({ children }: { children: ReactNode }) {
  const [serverFilters, setServerFilters] = useState<ServerFilters>(EMPTY_SERVER_FILTERS);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setStudents([]);
      setLoadedCount(0);
      setTotalCount(null);

      try {
        const first = await searchStudents("", 0, INITIAL_LENGTH, serverFilters);
        if (cancelled) return;
        setStudents(first.students);
        setTotalCount(first.records_total);
        setLoadedCount(first.students.length);

        const total = first.records_total;
        if (first.students.length >= total) {
          return;
        }

        setBackgroundLoading(true);
        const offsets: number[] = [];
        for (let start = INITIAL_LENGTH; start < total; start += BACKGROUND_PAGE_LENGTH) {
          offsets.push(start);
        }

        for (let i = 0; i < offsets.length; i += CONCURRENCY) {
          if (cancelled) return;
          const batch = offsets.slice(i, i + CONCURRENCY);
          const results = await Promise.all(
            batch.map((start) =>
              searchStudents("", start, Math.min(BACKGROUND_PAGE_LENGTH, total - start), serverFilters),
            ),
          );
          if (cancelled) return;

          setStudents((prev) => prev.concat(...results.map((r) => r.students)));
          setLoadedCount((prev) => prev + results.reduce((sum, r) => sum + r.students.length, 0));
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setBackgroundLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFilters.branchId, serverFilters.agentId, serverFilters.countryId, serverFilters.institutionId, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const value = useMemo<StudentsContextValue>(
    () => ({
      students,
      loadedCount,
      totalCount,
      backgroundLoading,
      error,
      refresh,
      serverFilters,
      setServerFilters,
      status,
      setStatus,
      query,
      setQuery,
      page,
      setPage,
    }),
    [students, loadedCount, totalCount, backgroundLoading, error, refresh, serverFilters, status, query, page],
  );

  return <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>;
}

export function useStudentsContext(): StudentsContextValue {
  const ctx = useContext(StudentsContext);
  if (!ctx) throw new Error("useStudentsContext must be used within StudentsProvider");
  return ctx;
}
