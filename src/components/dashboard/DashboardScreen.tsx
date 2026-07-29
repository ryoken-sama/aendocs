import { useDashboardContext } from "../../context/DashboardContext";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import { useStudentListContext } from "../../context/StudentListContext";
import { StatCard } from "./StatCard";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { RecentApplicationsList } from "./RecentApplicationsList";
import { RecentApplicationsListSkeleton } from "./RecentApplicationsListSkeleton";
import type { SectionKey, ServerFilters } from "../../types";

const EMPTY_SERVER_FILTERS: ServerFilters = { branchId: "", agentId: "", countryId: "", institutionId: "" };

export function DashboardScreen() {
  const {
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
  } = useDashboardContext();
  const { goToSearch, goToStudentsList } = useAppContext();
  const { setActiveSection, setServerFilters } = useStudentsContext();
  const { setFilter: setStudentsFilter } = useStudentListContext();

  // Every stat/chart number here is an unfiltered total (see
  // DashboardContext), so navigating from one always clears Study Abroad's
  // shared server filters first — otherwise landing on a page with a
  // leftover branch/agent/country/institution filter from an earlier visit
  // would show a subset that doesn't match the total just clicked.
  function goToStudyAbroadSection(section: SectionKey) {
    setServerFilters(EMPTY_SERVER_FILTERS);
    setActiveSection(section);
    goToSearch();
  }

  function goToAllStudents() {
    setStudentsFilter({ type: "all" });
    goToStudentsList();
  }

  function handleStatusBarClick(index: number) {
    const item = statusBreakdown[index];
    if (item) goToStudyAbroadSection(item.key);
  }

  function handleCountryBarClick(index: number) {
    const item = countryBreakdown[index];
    if (!item) return;
    setServerFilters({ ...EMPTY_SERVER_FILTERS, countryId: item.id });
    setActiveSection("applications");
    goToSearch();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh"
          className="rounded-full p-1.5 text-muted hover:bg-white/5 hover:text-ink disabled:opacity-50"
        >
          <i className={`ri-refresh-line text-lg leading-none ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {error ? (
        // A failed dashboard load is overwhelmingly a login/session problem
        // — every one of the dashboard's fetches depends on the same
        // ensure_logged_in() call, so when that fails they all fail
        // together. Showing stat cards stuck on skeletons (or charts
        // quietly rendering "no data") would look like an empty account
        // rather than a real failure, so replace the whole content area
        // with an explicit prompt instead.
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <i className="ri-lock-line text-3xl text-muted" aria-hidden="true" />
          <p className="text-base font-semibold text-ink">Session expired — please check your credentials in Settings</p>
          <p className="max-w-md text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="ri-team-line"
              label="Total Students"
              value={totalStudents}
              loading={loading}
              onClick={goToAllStudents}
            />
            <StatCard
              icon="ri-file-list-3-line"
              label="Total Applications"
              value={totalApplications}
              loading={loading}
              onClick={() => goToStudyAbroadSection("applications")}
            />
            <StatCard
              icon="ri-checkbox-circle-line"
              label="Visa Granted"
              value={visaGranted}
              loading={loading}
              onClick={() => goToStudyAbroadSection("granted")}
            />
            <StatCard
              icon="ri-send-plane-line"
              label="Offer Applied"
              value={offerApplied}
              loading={loading}
              onClick={() => goToStudyAbroadSection("applied")}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">Applications by Status</h3>
              <div className="mt-3">
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <HorizontalBarChart
                    data={statusBreakdown.map((s) => ({ label: s.label, count: s.count }))}
                    onBarClick={handleStatusBarClick}
                  />
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">Recent Applications</h3>
              <div className="mt-3">
                {loading ? (
                  <RecentApplicationsListSkeleton />
                ) : (
                  <RecentApplicationsList applications={recentApplications} />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Applications by Country</h3>
            <div className="mt-3">
              {loading ? (
                <ChartSkeleton />
              ) : countryBreakdown.length === 0 ? (
                <p className="text-sm text-muted">No country data available.</p>
              ) : (
                <HorizontalBarChart
                  data={countryBreakdown.map((c) => ({ label: c.label, count: c.count }))}
                  height={Math.max(200, countryBreakdown.length * 36)}
                  onBarClick={handleCountryBarClick}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
