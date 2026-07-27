import { invoke } from "@tauri-apps/api/core";
import type {
  DownloadSummary,
  LoginResult,
  Settings,
  SettingsInput,
  StudentDetail,
  StudentSearchResult,
  StudentSummary,
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

export function searchStudents(
  query: string,
  start: number,
  length: number,
): Promise<StudentSearchResult> {
  return invoke("search_students", { query, start, length });
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
