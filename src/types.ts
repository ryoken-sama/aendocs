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

export interface UserProfile {
  name: string;
  photo_url: string | null;
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

/** One row from the `/students` roster — distinct from `StudentSummary`,
 * which is one row of a specific *application* (`/offerapplications*`). A
 * student can have several applications; this is just their profile. */
export interface StudentListEntry {
  id: string;
  students_id: string;
  name: string;
  email: string;
  mobile: string;
  branch: string;
  country: string;
  visa_status: string;
  counselor: string;
  status: string;
}

export interface StudentListResult {
  records_total: number;
  records_filtered: number;
  students: StudentListEntry[];
}

/** A link to one of a student's individual applications, scraped from their
 * `/students/show/{id}` profile page — `id` is the `offerapplication_id`,
 * usable with the existing offerapplications detail fetch. */
export interface StudentApplicationLink {
  id: string;
  label: string;
}

/** Which sidebar "Students" item is selected — "all", or one specific
 * branch/agent/country picked from an expandable submenu. `label` is kept
 * alongside `id` purely for display (the id is what's sent server-side). */
export type StudentsFilterSelection =
  | { type: "all" }
  | { type: "branch"; id: string; label: string }
  | { type: "agent"; id: string; label: string }
  | { type: "country"; id: string; label: string };
