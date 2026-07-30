import { useDashboardContext } from "../../context/DashboardContext";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import { useStudentListContext } from "../../context/StudentListContext";
import { usePermissionsContext } from "../../context/PermissionsContext";
import { StatCard } from "./StatCard";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { PanelLoadingText } from "./PanelLoadingText";
import { RecentApplicationsList } from "./RecentApplicationsList";
import { SECTIONS, SECTION_PERMISSION_KEY } from "../../constants";
import type { SectionKey, ServerFilters } from "../../types";

const EMPTY_SERVER_FILTERS: ServerFilters = { branchId: "", agentId: "", countryId: "", institutionId: "" };

const STUDENT_COUNTS_LOADING_TEXT = "Loading student counts…";
const APPLICATION_STATS_LOADING_TEXT = "Loading application stats…";
const RECENT_ACTIVITY_LOADING_TEXT = "Loading recent activity…";
const COUNTRY_BREAKDOWN_LOADING_TEXT = "Loading country breakdown…";

// Literal, complete class strings per count (not built from an
// interpolated number) so Tailwind's static scanner can find them — with
// fewer than 4 stat cards visible, this stretches the remaining ones to
// fill the row instead of leaving empty column tracks.
const STAT_CARD_GRID_COLS: Record<number, string> = {
  0: "",
  1: "sm:grid-cols-1 lg:grid-cols-1",
  2: "sm:grid-cols-2 lg:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function DashboardScreen() {
  const {
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
  } = useDashboardContext();
  const { goToSearch, goToStudentsList } = useAppContext();
  const { setActiveSection, setServerFilters } = useStudentsContext();
  const { setFilter: setStudentsFilter } = useStudentListContext();
  const { can } = usePermissionsContext();

  // Known as soon as permissions have loaded (before any of the dashboard's
  // own data fetches settle), so gating on this — rather than on
  // statusBreakdown being empty — avoids ever flashing a loading spinner
  // for a card/panel that's guaranteed to end up hidden.
  const canSeeAnyApplications = SECTIONS.some((s) => can(SECTION_PERMISSION_KEY[s.key]));
  const canSeeAllStudents = can("all_students");
  const canSeeVisaGranted = can("visa_granted");
  const canSeeOfferApplied = can("offer_applied");
  const visibleStatCardCount = [canSeeAllStudents, canSeeAnyApplications, canSeeVisaGranted, canSeeOfferApplied].filter(
    Boolean,
  ).length;

  // Falls back to "Recent Visa Grants" (Section::Granted) when the account
  // can't see /offerapplications at all but can see /offerapplications/
  // granted — see DashboardContext's separate recent-applications effect,
  // which fetches whichever of these is actually shown.
  const showRecentApplications = can("student_applications");
  const showRecentVisaGrants = !showRecentApplications && canSeeVisaGranted;
  const showRecentPanel = showRecentApplications || showRecentVisaGrants;
  // Same "don't leave a gap" reasoning as the stat cards: if only one of
  // these two panels is visible, it should take the full row instead of
  // sitting at half width next to empty space.
  const middleRowCols = canSeeAnyApplications && showRecentPanel ? "lg:grid-cols-2" : "lg:grid-cols-1";

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
        // together. Showing stat cards/panels as if the account were just
        // empty would be misleading, so replace the whole content area
        // with an explicit prompt instead.
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <i className="ri-lock-line text-3xl text-muted" aria-hidden="true" />
          <p className="text-base font-semibold text-ink">Session expired — please check your credentials in Settings</p>
          <p className="max-w-md text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : (
        <>
          {visibleStatCardCount > 0 && (
            <div className={`mt-4 grid grid-cols-1 gap-4 ${STAT_CARD_GRID_COLS[visibleStatCardCount]}`}>
              {canSeeAllStudents && (
                <StatCard
                  icon="ri-team-line"
                  label="Total Students"
                  value={totalStudents}
                  loading={studentsLoading}
                  loadingText={STUDENT_COUNTS_LOADING_TEXT}
                  onClick={goToAllStudents}
                />
              )}
              {canSeeAnyApplications && (
                <StatCard
                  icon="ri-file-list-3-line"
                  label="Total Applications"
                  value={totalApplications}
                  loading={applicationsLoading}
                  loadingText={APPLICATION_STATS_LOADING_TEXT}
                  onClick={() => goToStudyAbroadSection("applications")}
                />
              )}
              {canSeeVisaGranted && (
                <StatCard
                  icon="ri-checkbox-circle-line"
                  label="Visa Granted"
                  value={visaGranted}
                  loading={applicationsLoading}
                  loadingText={APPLICATION_STATS_LOADING_TEXT}
                  onClick={() => goToStudyAbroadSection("granted")}
                />
              )}
              {canSeeOfferApplied && (
                <StatCard
                  icon="ri-send-plane-line"
                  label="Offer Applied"
                  value={offerApplied}
                  loading={applicationsLoading}
                  loadingText={APPLICATION_STATS_LOADING_TEXT}
                  onClick={() => goToStudyAbroadSection("applied")}
                />
              )}
            </div>
          )}

          {(canSeeAnyApplications || showRecentPanel) && (
            <div className={`mt-6 grid grid-cols-1 gap-4 ${middleRowCols}`}>
              {canSeeAnyApplications && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-sm font-semibold text-ink">Applications by Status</h3>
                  <div className="mt-3">
                    {applicationsLoading ? (
                      <PanelLoadingText text={APPLICATION_STATS_LOADING_TEXT} />
                    ) : (
                      <HorizontalBarChart
                        data={statusBreakdown.map((s) => ({ label: s.label, count: s.count }))}
                        onBarClick={handleStatusBarClick}
                      />
                    )}
                  </div>
                </div>
              )}

              {showRecentPanel && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-sm font-semibold text-ink">
                    {showRecentApplications ? "Recent Applications" : "Recent Visa Grants"}
                  </h3>
                  <div className="mt-3">
                    {recentLoading ? (
                      <PanelLoadingText text={RECENT_ACTIVITY_LOADING_TEXT} />
                    ) : (
                      <RecentApplicationsList applications={recentApplications} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {can("student_applications") && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">Applications by Country</h3>
              <div className="mt-3">
                {countryLoading ? (
                  <PanelLoadingText text={COUNTRY_BREAKDOWN_LOADING_TEXT} />
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
          )}
        </>
      )}
    </div>
  );
}
