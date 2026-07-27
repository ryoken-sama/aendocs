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
