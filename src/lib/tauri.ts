import { invoke } from "@tauri-apps/api/core";
import type {
  DownloadSummary,
  FilterOptions,
  LoginResult,
  PermissionsMap,
  RecentApplication,
  SectionKey,
  ServerFilters,
  Settings,
  StudentApplicationLink,
  StudentDetail,
  StudentListResult,
  StudentSearchResult,
  StudentSummary,
  ThemePreference,
  UserProfile,
} from "../types";

export function getUserProfile(): Promise<UserProfile> {
  return invoke("get_user_profile");
}

/** Clears the session and, if "Remember me" was on for the saved account,
 * forgets it (keyring + settings) too — otherwise just the session, since
 * an un-remembered session had nothing else saved to clear. */
export function logout(): Promise<void> {
  return invoke("logout");
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function saveOutputFolder(outputFolder: string): Promise<void> {
  return invoke("save_output_folder", { outputFolder });
}

/** The Login screen's explicit sign-in. On success, persists the
 * credentials to the keyring/settings only if `rememberMe`. */
export function signIn(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
  return invoke("sign_in", { email, password, rememberMe });
}

/** Launch-time silent login using a previously "remembered" account.
 * Resolves `null` (not a failure) when there's nothing saved — the caller
 * should show the Login screen directly in that case, not an error. */
export function autoLogin(): Promise<LoginResult | null> {
  return invoke("auto_login");
}

/** Settings screen's "Change Account": unconditionally clears the session
 * and any saved keyring/account, regardless of "Remember me". */
export function changeAccount(): Promise<void> {
  return invoke("change_account");
}

/** Clears the (possibly stale) session and forces a real login before the
 * next request — used by the dashboard's "Retry" button so it's guaranteed
 * to attempt a fresh login rather than just refetching against a session
 * that may already be dead. */
export function forceRelogin(): Promise<void> {
  return invoke("force_relogin");
}

export function getThemePreference(): Promise<ThemePreference> {
  return invoke("get_theme_preference");
}

export function saveThemePreference(preference: ThemePreference): Promise<void> {
  return invoke("save_theme_preference", { preference });
}

export function searchStudents(
  section: SectionKey,
  query: string,
  start: number,
  length: number,
  filters: ServerFilters,
): Promise<StudentSearchResult> {
  return invoke("search_students", {
    query,
    start,
    length,
    section,
    branchId: filters.branchId,
    agentId: filters.agentId,
    countryId: filters.countryId,
    institutionId: filters.institutionId,
  });
}

export function getFilterOptions(): Promise<FilterOptions> {
  return invoke("get_filter_options");
}

export function getStudentDetail(studentId: string): Promise<StudentDetail> {
  return invoke("get_student_detail", { studentId });
}

export function getDocumentCategories(country: string): Promise<string[]> {
  return invoke("get_document_categories", { country });
}

export function downloadAndOrganize(
  student: StudentSummary,
  categoryOverrides: Record<string, string>,
): Promise<DownloadSummary> {
  return invoke("download_and_organize", { student, categoryOverrides });
}

export function searchStudentsList(
  query: string,
  start: number,
  length: number,
  branchId: string,
  agentId: string,
  countryId: string,
): Promise<StudentListResult> {
  return invoke("search_students_list", { query, start, length, branchId, agentId, countryId });
}

export function getStudentApplications(studentsId: string): Promise<StudentApplicationLink[]> {
  return invoke("get_student_applications", { studentsId });
}

/** `section` picks which endpoint's "most recently updated" rows to
 * fetch — normally "applications", but the dashboard falls back to
 * "granted" ("Recent Visa Grants") when the account can't see
 * `/offerapplications` at all. */
export function getRecentApplications(section: SectionKey, length: number): Promise<RecentApplication[]> {
  return invoke("get_recent_applications", { section, length });
}

/** Cached per-login on the backend — probes every endpoint once, so this
 * is cheap to call repeatedly (e.g. on a dashboard refresh). */
export function getPermissions(): Promise<PermissionsMap> {
  return invoke("get_permissions");
}
