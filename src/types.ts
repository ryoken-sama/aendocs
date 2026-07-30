export interface Settings {
  email: string;
  output_folder: string;
  remember_me: boolean;
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

/** One row of the dashboard's "Recent Applications" panel — an
 * offerapplication plus its (best-effort, see dashboard.rs) update
 * timestamp, used only for the relative "2 hours ago" display. */
export interface RecentApplication {
  student: StudentSummary;
  updated_at: string;
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

/** One row of a student's individual applications table, scraped from their
 * `/students/show/{id}` profile page — `id` is the `offerapplication_id`,
 * usable with the existing offerapplications detail fetch. */
export interface StudentApplicationLink {
  id: string;
  application_id: string;
  date: string;
  country: string;
  university: string;
  program: string;
  status: string;
}

/** Which sidebar "Students" item is selected — "all", or one specific
 * branch/agent/country picked from an expandable submenu. `label` is kept
 * alongside `id` purely for display (the id is what's sent server-side). */
export type StudentsFilterSelection =
  | { type: "all" }
  | { type: "branch"; id: string; label: string }
  | { type: "agent"; id: string; label: string }
  | { type: "country"; id: string; label: string };

/** The 11 endpoints probed once per login to build the permissions map —
 * must stay in sync with the keys `permissions.rs` probes/reports under on
 * the Rust side (`Section::permission_key` for the 7 offerapplications
 * ones, plus the 4 `/students`-domain keys). */
export type PermissionKey =
  | "student_applications"
  | "offer_applied"
  | "offer_issued"
  | "processing"
  | "visa_withdraw"
  | "visa_rejected"
  | "visa_granted"
  | "all_students"
  | "by_branch"
  | "by_agent"
  | "by_country";

/** `permission_key -> accessible`. Always has all 11 `PermissionKey`s once
 * probing has completed, but typed as a partial record since it arrives
 * as a plain JS object from the backend with no runtime guarantee. */
export type PermissionsMap = Partial<Record<PermissionKey, boolean>>;
