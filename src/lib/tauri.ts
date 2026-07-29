import { invoke } from "@tauri-apps/api/core";
import type {
  DownloadSummary,
  FilterOptions,
  LoginResult,
  RecentApplication,
  SectionKey,
  ServerFilters,
  Settings,
  SettingsInput,
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

export function logout(): Promise<void> {
  return invoke("logout");
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function saveSettings(settings: SettingsInput): Promise<void> {
  return invoke("save_settings", { settings });
}

export function testLogin(): Promise<LoginResult> {
  return invoke("test_login");
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

export function getRecentApplications(length: number): Promise<RecentApplication[]> {
  return invoke("get_recent_applications", { length });
}
