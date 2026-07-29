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
  loading: boolean;
  error: string | null;
  refresh: () => void;

  totalStudents: number | null;
  totalApplications: number | null;
  visaGranted: number | null;
  offerApplied: number | null;
  statusBreakdown: StatusCount[];
  countryBreakdown: CountryCount[];
  recentApplications: RecentApplication[];
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/**
 * Owns the Dashboard's data: all of it is just `recordsTotal` from length=1
 * requests against endpoints the rest of the app already calls (the 7
 * Study Abroad sections, the students roster, and one `/offerapplications`
 * request per known country), fired in parallel — plus the one genuinely
 * new request, "Recent Applications" (see get_recent_applications in the
 * Rust backend). Mounted above the screen switch like the other data
 * contexts, so navigating away and back doesn't refetch; only refresh()
 * (or the country list finishing its own separate load) does.
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const { options: filterOptions } = useFilterOptions();
  const [refreshToken, setRefreshToken] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([]);
  const [countryBreakdown, setCountryBreakdown] = useState<CountryCount[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  const countryKey = JSON.stringify(filterOptions.country);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const [sectionResults, studentsList, recent, countryResults] = await Promise.all([
          Promise.all(SECTIONS.map((s) => searchStudents(s.key, "", 0, 1, EMPTY_FILTERS))),
          searchStudentsList("", 0, 1, "", "", ""),
          getRecentApplications(RECENT_LENGTH),
          Promise.all(
            filterOptions.country.map((c) =>
              searchStudents("applications", "", 0, 1, { ...EMPTY_FILTERS, countryId: c.id }),
            ),
          ),
        ]);

        if (cancelled) return;

        setStatusBreakdown(
          SECTIONS.map((s, i) => ({ key: s.key, label: s.label, count: sectionResults[i].records_total })),
        );
        setTotalStudents(studentsList.records_total);
        setRecentApplications(recent);
        setCountryBreakdown(
          filterOptions.country.map((c, i) => ({ id: c.id, label: c.name, count: countryResults[i].records_total })),
        );
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
  }, [refreshToken, countryKey]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const totalApplications = statusBreakdown.find((s) => s.key === "applications")?.count ?? null;
  const visaGranted = statusBreakdown.find((s) => s.key === "granted")?.count ?? null;
  const offerApplied = statusBreakdown.find((s) => s.key === "applied")?.count ?? null;

  const value = useMemo<DashboardContextValue>(
    () => ({
      loading,
      error,
      refresh,
      totalStudents,
      totalApplications,
      visaGranted,
      offerApplied,
      statusBreakdown,
      countryBreakdown,
      recentApplications,
    }),
    [
      loading,
      error,
      refresh,
      totalStudents,
      totalApplications,
      visaGranted,
      offerApplied,
      statusBreakdown,
      countryBreakdown,
      recentApplications,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardContext must be used within DashboardProvider");
  return ctx;
}
