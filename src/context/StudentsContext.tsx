import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { searchStudents } from "../lib/tauri";
import { SECTIONS } from "../constants";
import type { SectionKey, ServerFilters, StudentSummary } from "../types";

/** Records per server page — also what aenapply's own DataTables requests
 * use, so each interaction (page change, search, filter) is one small,
 * fast request instead of the multi-page background load this used to do. */
const PAGE_LENGTH = 20;

const EMPTY_SERVER_FILTERS: ServerFilters = {
  branchId: "",
  agentId: "",
  countryId: "",
  institutionId: "",
};

interface SectionUiState {
  query: string;
  page: number;
}

function initialUiStates(): Record<SectionKey, SectionUiState> {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, { query: "", page: 0 }])) as Record<
    SectionKey,
    SectionUiState
  >;
}

function initialRefreshTokens(): Record<SectionKey, number> {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, 0])) as Record<SectionKey, number>;
}

interface StudentsContextValue {
  activeSection: SectionKey;
  setActiveSection: (key: SectionKey) => void;

  students: StudentSummary[];
  totalCount: number | null;
  totalPages: number;
  loading: boolean;
  error: string | null;
  /** Re-fetches the current page from the server, bypassing nothing since
   * there's no cache to bypass — it just forces a repeat request. */
  refresh: () => void;

  serverFilters: ServerFilters;
  setServerFilters: (updater: ServerFilters | ((prev: ServerFilters) => ServerFilters)) => void;
  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (updater: number | ((prev: number) => number)) => void;
}

const StudentsContext = createContext<StudentsContextValue | null>(null);

/**
 * Owns the active sidebar section, the shared server-side filters, and each
 * section's own search query and page number — all at a level above the
 * screen switch in App.tsx, so navigating to a student's detail page and
 * back leaves everything untouched instead of remounting SearchScreen and
 * losing it.
 *
 * There is no record cache: every change to the active section, its page,
 * its query, the shared filters, or an explicit refresh() fetches exactly
 * one page (20 records) from the server and replaces what's displayed.
 * Returning to a section/page/query combination that hasn't changed simply
 * doesn't re-trigger the effect, so the last-fetched page is still there —
 * that's what makes "coming back" free without needing to cache anything.
 */
export function StudentsProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionKey>(SECTIONS[0].key);
  const [serverFilters, setServerFilters] = useState<ServerFilters>(EMPTY_SERVER_FILTERS);
  const [uiStates, setUiStates] = useState<Record<SectionKey, SectionUiState>>(initialUiStates);
  const [refreshTokens, setRefreshTokens] = useState<Record<SectionKey, number>>(initialRefreshTokens);

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUi = uiStates[activeSection];
  const activeRefreshToken = refreshTokens[activeSection];

  // Tracks whether this effect run was triggered by switching sections (as
  // opposed to a page/query/filter/refresh change within the same section)
  // so only a section switch clears `students` synchronously — that's what
  // makes SearchScreen's skeleton loader show immediately instead of a
  // fetch resolving before the new section's stale data ever displayed. A
  // page/filter/query change on the same section instead leaves the
  // previous page visible (with the small spinning refresh icon) until the
  // new one arrives.
  const previousSectionRef = useRef(activeSection);

  useEffect(() => {
    let cancelled = false;
    const section = activeSection;
    const page = activeUi.page;
    const query = activeUi.query;

    if (previousSectionRef.current !== section) {
      previousSectionRef.current = section;
      setStudents([]);
      setTotalCount(null);
    }

    setLoading(true);
    setError(null);

    async function run() {
      try {
        const result = await searchStudents(section, query, page * PAGE_LENGTH, PAGE_LENGTH, serverFilters);
        if (cancelled) return;
        setStudents(result.students);
        setTotalCount(result.records_total);

        // The remembered page no longer exists under the current filters/
        // query (e.g. a filter change narrowed the results) — snap back to
        // page 0 rather than showing a blank page forever.
        if (result.students.length === 0 && page > 0 && result.records_total > 0) {
          setUiStates((prev) => ({ ...prev, [section]: { ...prev[section], page: 0 } }));
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
  }, [activeSection, activeUi.page, activeUi.query, serverFilters, activeRefreshToken]);

  const refresh = useCallback(() => {
    setRefreshTokens((prev) => ({ ...prev, [activeSection]: prev[activeSection] + 1 }));
  }, [activeSection]);

  const setQuery = useCallback(
    (query: string) => {
      setUiStates((prev) => ({ ...prev, [activeSection]: { ...prev[activeSection], query } }));
    },
    [activeSection],
  );

  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setUiStates((prev) => {
        const current = prev[activeSection];
        const nextPage = typeof updater === "function" ? (updater as (p: number) => number)(current.page) : updater;
        return { ...prev, [activeSection]: { ...current, page: nextPage } };
      });
    },
    [activeSection],
  );

  const totalPages = useMemo(
    () => (totalCount !== null ? Math.max(1, Math.ceil(totalCount / PAGE_LENGTH)) : 1),
    [totalCount],
  );

  const value = useMemo<StudentsContextValue>(
    () => ({
      activeSection,
      setActiveSection,
      students,
      totalCount,
      totalPages,
      loading,
      error,
      refresh,
      serverFilters,
      setServerFilters,
      query: activeUi.query,
      setQuery,
      page: activeUi.page,
      setPage,
    }),
    [
      activeSection,
      students,
      totalCount,
      totalPages,
      loading,
      error,
      refresh,
      serverFilters,
      activeUi,
      setQuery,
      setPage,
    ],
  );

  return <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>;
}

export function useStudentsContext(): StudentsContextValue {
  const ctx = useContext(StudentsContext);
  if (!ctx) throw new Error("useStudentsContext must be used within StudentsProvider");
  return ctx;
}
