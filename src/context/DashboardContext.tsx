import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { searchStudents, searchStudentsList, getRecentApplications } from "../lib/tauri";
import { useFilterOptions } from "../hooks/useFilterOptions";
import { SECTIONS } from "../constants";
import type { RecentApplication, SectionKey, ServerFilters } from "../types";

const RECENT_LENGTH = 5;

const EMPTY_FILTERS: ServerFilters = { branchId: "", agentId: "", countryId: "", institutionId: "" };

export interface StatusCount {
  key: SectionKey;
  label: string;
  count: number;
}

export interface CountryCount {
  id: string;
  label: string;
  count: number;
}

interface DashboardContextValue {
  /** True while any of the 4 fetch groups below is still in flight —
   * drives the Refresh button's spinner. Each panel/card should prefer its
   * own more specific *Loading flag over this one. */
  loading: boolean;
  /** Any of the 4 groups' errors, aggregated — every one of them depends
   * on the same ensure_logged_in(), so in practice a failure here almost
   * always means all 4 failed together (a login/session problem). */
  error: string | null;
  refresh: () => void;

  studentsLoading: boolean;
  totalStudents: number | null;

  applicationsLoading: boolean;
  /** Sum of recordsTotal across all 7 Study Abroad sections — NOT just the
   * "Student Applications" section's own count. */
  totalApplications: number | null;
  visaGranted: number | null;
  offerApplied: number | null;
  statusBreakdown: StatusCount[];

  recentLoading: boolean;
  recentApplications: RecentApplication[];

  countryLoading: boolean;
  countryBreakdown: CountryCount[];
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/**
 * Owns the Dashboard's data: all of it is just `recordsTotal` from length=1
 * requests against endpoints the rest of the app already calls (the 7
 * Study Abroad sections, the students roster, and one `/offerapplications`
 * request per known country), plus the one genuinely new request, "Recent
 * Applications" (see get_recent_applications in the Rust backend).
 *
 * The 4 groups (students count / application stats / recent applications /
 * country breakdown) are fetched as 4 independent promise chains — not one
 * combined Promise.all — so each one's own loading flag clears as soon as
 * THAT group's data arrives, letting each panel show its own loading text
 * independently, while still all firing in parallel (nothing here awaits
 * another group before starting).
 *
 * Mounted above the screen switch like the other data contexts, so
 * navigating away and back doesn't refetch; only refresh() (or the country
 * list finishing its own separate load) does.
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const { options: filterOptions } = useFilterOptions();
  const [refreshToken, setRefreshToken] = useState(0);

  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);

  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([]);

  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  const [countryLoading, setCountryLoading] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [countryBreakdown, setCountryBreakdown] = useState<CountryCount[]>([]);

  const countryKey = JSON.stringify(filterOptions.country);

  useEffect(() => {
    let cancelled = false;

    setStudentsLoading(true);
    setStudentsError(null);
    searchStudentsList("", 0, 1, "", "", "")
      .then((result) => {
        if (cancelled) return;
        setTotalStudents(result.records_total);
      })
      .catch((e) => {
        if (!cancelled) setStudentsError(String(e));
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    setApplicationsLoading(true);
    setApplicationsError(null);
    Promise.all(SECTIONS.map((s) => searchStudents(s.key, "", 0, 1, EMPTY_FILTERS)))
      .then((results) => {
        if (cancelled) return;
        setStatusBreakdown(
          SECTIONS.map((s, i) => ({ key: s.key, label: s.label, count: results[i].records_total })),
        );
      })
      .catch((e) => {
        if (!cancelled) setApplicationsError(String(e));
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false);
      });

    setRecentLoading(true);
    setRecentError(null);
    getRecentApplications(RECENT_LENGTH)
      .then((result) => {
        if (cancelled) return;
        setRecentApplications(result);
      })
      .catch((e) => {
        if (!cancelled) setRecentError(String(e));
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });

    setCountryLoading(true);
    setCountryError(null);
    Promise.all(
      filterOptions.country.map((c) =>
        searchStudents("applications", "", 0, 1, { ...EMPTY_FILTERS, countryId: c.id }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        setCountryBreakdown(
          filterOptions.country.map((c, i) => ({ id: c.id, label: c.name, count: results[i].records_total })),
        );
      })
      .catch((e) => {
        if (!cancelled) setCountryError(String(e));
      })
      .finally(() => {
        if (!cancelled) setCountryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, countryKey]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const totalApplications = statusBreakdown.length > 0 ? statusBreakdown.reduce((sum, s) => sum + s.count, 0) : null;
  const visaGranted = statusBreakdown.find((s) => s.key === "granted")?.count ?? null;
  const offerApplied = statusBreakdown.find((s) => s.key === "applied")?.count ?? null;

  const loading = studentsLoading || applicationsLoading || recentLoading || countryLoading;
  const error = studentsError ?? applicationsError ?? recentError ?? countryError;

  const value = useMemo<DashboardContextValue>(
    () => ({
      loading,
      error,
      refresh,
      studentsLoading,
      totalStudents,
      applicationsLoading,
      totalApplications,
      visaGranted,
      offerApplied,
      statusBreakdown,
      recentLoading,
      recentApplications,
      countryLoading,
      countryBreakdown,
    }),
    [
      loading,
      error,
      refresh,
      studentsLoading,
      totalStudents,
      applicationsLoading,
      totalApplications,
      visaGranted,
      offerApplied,
      statusBreakdown,
      recentLoading,
      recentApplications,
      countryLoading,
      countryBreakdown,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardContext must be used within DashboardProvider");
  return ctx;
}
