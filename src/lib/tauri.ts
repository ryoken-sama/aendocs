import { invoke } from "@tauri-apps/api/core";
import type {
  DownloadSummary,
  FilterOptions,
  LoginResult,
  ServerFilters,
  Settings,
  SettingsInput,
  StudentDetail,
  StudentSearchResult,
  StudentSummary,
  ThemePreference,
} from "../types";

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
  query: string,
  start: number,
  length: number,
  filters: ServerFilters,
): Promise<StudentSearchResult> {
  return invoke("search_students", {
    query,
    start,
    length,
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

export function downloadAndOrganize(
  student: StudentSummary,
  categoryOverrides: Record<string, string>,
): Promise<DownloadSummary> {
  return invoke("download_and_organize", { student, categoryOverrides });
}
