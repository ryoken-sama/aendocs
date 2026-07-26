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

export interface StudentSummary {
  id: string;
  name: string;
  branch: string;
  country: string;
  university: string;
  program: string;
}

export interface StudentSearchResult {
  records_total: number;
  records_filtered: number;
  students: StudentSummary[];
}

export interface DetailDocEntry {
  label: string;
  present: boolean;
}

export interface StudentDetail {
  id: string;
  name: string;
  branch: string;
  country: string;
  university: string;
  program: string;
  documents: DetailDocEntry[];
}

export type DocStatus = "present" | "missing" | "not_required";

export interface DocRequirementStatus {
  category: string;
  status: DocStatus;
}

export interface DownloadSummary {
  files_written: number;
  skipped: number;
  output_path: string;
  missing_categories: string[];
}

export type ProgressStep =
  | "starting"
  | "logging_in"
  | "downloading_zip"
  | "extracting_zip"
  | "renaming"
  | "writing_file"
  | "creating_folder"
  | "done"
  | "error";

export type ProgressLevel = "info" | "warn" | "error" | "success";

export interface ProgressEvent {
  student_id: string;
  step: ProgressStep;
  message: string;
  level: ProgressLevel;
  timestamp: string;
}
