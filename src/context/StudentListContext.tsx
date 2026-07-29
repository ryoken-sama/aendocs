import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { searchStudentsList } from "../lib/tauri";
import type { StudentListEntry, StudentsFilterSelection } from "../types";

/** Matches StudentsContext's PAGE_LENGTH — one page per request, no
 * client-side record cache. See that file's comment for the reasoning. */
const PAGE_LENGTH = 20;

const ALL_STUDENTS: StudentsFilterSelection = { type: "all" };

interface StudentListContextValue {
  filter: StudentsFilterSelection;
  setFilter: (filter: StudentsFilterSelection) => void;

  students: StudentListEntry[];
  totalCount: number | null;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;

  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (updater: number | ((prev: number) => number)) => void;
}

const StudentListContext = createContext<StudentListContextValue | null>(null);

/**
 * Owns the "Students" sidebar group's state: which filter is selected (all,
 * or a specific branch/agent/country), the free-text query, and the current
 * page — mirroring StudentsContext's model (one page fetched per change, no
 * cache) but for the separate `/students` roster endpoint, which returns a
 * different row shape (StudentListEntry) than the offerapplications flow.
 */
export function StudentListProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<StudentsFilterSelection>(ALL_STUDENTS);
  const [query, setQueryState] = useState("");
  const [page, setPageState] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  const [students, setStudents] = useState<StudentListEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const branchId = filter.type === "branch" ? filter.id : "";
    const agentId = filter.type === "agent" ? filter.id : "";
    const countryId = filter.type === "country" ? filter.id : "";

    async function run() {
      try {
        const result = await searchStudentsList(query, page * PAGE_LENGTH, PAGE_LENGTH, branchId, agentId, countryId);
        if (cancelled) return;
        setStudents(result.students);
        setTotalCount(result.records_total);

        // The remembered page no longer exists under the current filter/
        // query — snap back to page 0 rather than showing a blank page.
        if (result.students.length === 0 && page > 0 && result.records_total > 0) {
          setPageState(0);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, query, page, refreshToken]);

  const setFilter = useCallback((next: StudentsFilterSelection) => {
    setFilterState(next);
    setPageState(0);
  }, []);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setPageState(0);
  }, []);

  const setPage = useCallback((updater: number | ((prev: number) => number)) => {
    setPageState((prev) => (typeof updater === "function" ? (updater as (p: number) => number)(prev) : updater));
  }, []);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const totalPages = useMemo(
    () => (totalCount !== null ? Math.max(1, Math.ceil(totalCount / PAGE_LENGTH)) : 1),
    [totalCount],
  );

  const value = useMemo<StudentListContextValue>(
    () => ({
      filter,
      setFilter,
      students,
      totalCount,
      totalPages,
      loading,
      error,
      refresh,
      query,
      setQuery,
      page,
      setPage,
    }),
    [filter, setFilter, students, totalCount, totalPages, loading, error, refresh, query, setQuery, page, setPage],
  );

  return <StudentListContext.Provider value={value}>{children}</StudentListContext.Provider>;
}

export function useStudentListContext(): StudentListContextValue {
  const ctx = useContext(StudentListContext);
  if (!ctx) throw new Error("useStudentListContext must be used within StudentListProvider");
  return ctx;
}
