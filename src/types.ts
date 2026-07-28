export interface Settings {
  email: string;
  output_folder: string;
}

export interface SettingsInput {
  email: string;
  output_folder: string;
  password?: string | null;
}

export interface LoginResult {
  success: boolean;
  message: string;
}

export interface ThemePreference {
  dark_mode: boolean;
}

export interface StudentSummary {
  id: string;
  students_id: string;
  application_id: string;
  name: string;
  branch: string;
  country: string;
  university: string;
  program: string;
  status: string;
}

export interface StudentSearchResult {
  records_total: number;
  records_filtered: number;
  students: StudentSummary[];
}

export interface FilterOption {
  id: string;
  name: string;
}

export interface FilterOptions {
  branch: FilterOption[];
  agent: FilterOption[];
  country: FilterOption[];
  institution: FilterOption[];
}

/** IDs (not display names) sent to the server as DataTables queryStrings
 * filters. Empty string means "no filter" for that field. Shared across all
 * 7 sidebar sections. */
export interface ServerFilters {
  branchId: string;
  agentId: string;
  countryId: string;
  institutionId: string;
}

/** One of the 7 aenapply.com application-list views reachable from the
 * sidebar. Must stay in sync with `Section::from_key` in the Rust backend
 * (src-tauri/src/students/section.rs), which uses these exact strings. */
export type SectionKey =
  | "applications"
  | "applied"
  | "issued"
  | "processing"
  | "withdrawn"
  | "rejected"
  | "granted";

export interface DetailDocEntry {
  name: string;
  url: string;
  filename: string;
  suggested_category: string | null;
}

export interface StudentDetail {
  documents: DetailDocEntry[];
}

export interface DownloadSummary {
  files_written: number;
  skipped: number;
  output_path: string;
  missing_categories: string[];
}
