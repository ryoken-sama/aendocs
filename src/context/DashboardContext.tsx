import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { searchStudents, searchStudentsList, getRecentApplications, forceRelogin } from "../lib/tauri";
import { useFilterOptions } from "../hooks/useFilterOptions";
import { usePermissionsContext } from "./PermissionsContext";
import { SECTIONS, SECTION_PERMISSION_KEY } from "../constants";
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
  /** studentsError or recentError — the application-stats and country
   * groups no longer contribute here (see the fetch effect), since a
   * per-section/per-country failure there is now routinely just a
   * permissions restriction, not a login/session problem. */
  error: string | null;
  refresh: () => void;
  /** Like `refresh`, but forces a real login first — use this for the
   * error screen's "Retry" button, where the previous failure may mean the
   * session is actually dead (see forceRelogin). Plain `refresh` alone
   * would just refetch against that same dead session and fail identically
   * if `ensure_logged_in`'s stale flag still says "logged in". */
  retry: () => void;

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
  const { permissions } = usePermissionsContext();
  const [refreshToken, setRefreshToken] = useState(0);

  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);

  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [rawStatusBreakdown, setRawStatusBreakdown] = useState<StatusCount[]>([]);

  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  const [countryLoading, setCountryLoading] = useState(true);
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
    // allSettled, not all: a section the current account isn't permitted
    // to see (403) is now an expected, per-section outcome — not a reason
    // to fail the whole "Applications by Status" panel the way one
    // rejection in Promise.all would. Sections that reject (permission
    // denied or otherwise) are simply omitted here; which ones actually
    // get hidden from the UI is decided from the permissions map below,
    // not from whether this fetch happened to succeed.
    Promise.allSettled(SECTIONS.map((s) => searchStudents(s.key, "", 0, 1, EMPTY_FILTERS))).then((results) => {
      if (cancelled) return;
      const breakdown: StatusCount[] = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          breakdown.push({ key: SECTIONS[i].key, label: SECTIONS[i].label, count: result.value.records_total });
        }
      });
      setRawStatusBreakdown(breakdown);
      setApplicationsLoading(false);
    });

    setCountryLoading(true);
    // allSettled, same reasoning as the status breakdown above — this
    // panel is hidden entirely when "by_country" is denied (see
    // DashboardScreen), so a per-country rejection here shouldn't surface
    // as a hard error; it should just leave that country out.
    Promise.allSettled(
      filterOptions.country.map((c) =>
        searchStudents("applications", "", 0, 1, { ...EMPTY_FILTERS, countryId: c.id }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const breakdown: CountryCount[] = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          breakdown.push({ id: filterOptions.country[i].id, label: filterOptions.country[i].name, count: result.value.records_total });
        }
      });
      setCountryBreakdown(breakdown);
      setCountryLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, countryKey]);

  // Separate from the effect above because, unlike the other 3 groups,
  // this one needs to know permissions *before* it can even decide what to
  // request: "Recent Applications" (Section::Applications) if accessible,
  // else "Recent Visa Grants" (Section::Granted) as a fallback, else
  // nothing. Waits for `permissions` to resolve rather than firing
  // unconditionally in parallel — DashboardSplashGate already keeps the
  // launch splash up until permissions have settled, so this doesn't cost
  // any additional visible delay.
  useEffect(() => {
    if (!permissions) return;
    let cancelled = false;

    const targetSection: SectionKey | null = permissions.student_applications
      ? "applications"
      : permissions.visa_granted
        ? "granted"
        : null;

    if (!targetSection) {
      setRecentApplications([]);
      setRecentLoading(false);
      return;
    }

    setRecentLoading(true);
    setRecentError(null);
    getRecentApplications(targetSection, RECENT_LENGTH)
      .then((result) => {
        if (!cancelled) setRecentApplications(result);
      })
      .catch((e) => {
        if (!cancelled) setRecentError(String(e));
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [permissions, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const retry = useCallback(() => {
    // Errors from this are ignored here — the subsequent refetch's own
    // per-group error states already surface whatever's still wrong (bad
    // credentials, no network, etc.) through the normal error UI.
    forceRelogin()
      .catch(() => {})
      .finally(() => setRefreshToken((t) => t + 1));
  }, []);

  // Sections the account has no access to are excluded here — not just
  // from the chart, but from every number derived off statusBreakdown
  // below (Total Applications, Visa Granted, Offer Applied), satisfying
  // "sum of only accessible offerapplication endpoints". While permissions
  // themselves are still loading, everything fetched so far is shown
  // (fail open, matching PermissionsContext.can) rather than blanking the
  // panel — in practice this window is invisible, since
  // DashboardSplashGate keeps the launch splash up until permissions have
  // settled too.
  const statusBreakdown = useMemo(
    () =>
      permissions
        ? rawStatusBreakdown.filter((s) => permissions[SECTION_PERMISSION_KEY[s.key]] === true)
        : rawStatusBreakdown,
    [rawStatusBreakdown, permissions],
  );

  const totalApplications = statusBreakdown.length > 0 ? statusBreakdown.reduce((sum, s) => sum + s.count, 0) : null;
  const visaGranted = statusBreakdown.find((s) => s.key === "granted")?.count ?? null;
  const offerApplied = statusBreakdown.find((s) => s.key === "applied")?.count ?? null;

  const loading = studentsLoading || applicationsLoading || recentLoading || countryLoading;
  // Individual section/country rejections (see allSettled above) no longer
  // surface here — those are now an expected outcome of missing
  // permissions, not a session problem. A genuine session expiry still
  // shows up via studentsError/recentError, which are single (unbatched)
  // requests.
  const error = studentsError ?? recentError;

  const value = useMemo<DashboardContextValue>(
    () => ({
      loading,
      error,
      refresh,
      retry,
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
      retry,
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
