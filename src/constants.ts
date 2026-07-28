import type { SectionKey } from "./types";

export const APP_NAME = "AEN Document Manager";

export interface SectionDef {
  key: SectionKey;
  label: string;
  /** Remixicon class, e.g. "ri-file-list-3-line". */
  icon: string;
}

/** The 7 sidebar sections, in display order. Each maps to its own
 * aenapply.com `/offerapplications[...]` DataTables endpoint — see
 * `Section::url`/`Section::columns` in the Rust backend. */
export const SECTIONS: SectionDef[] = [
  { key: "applications", label: "Applications", icon: "ri-file-list-3-line" },
  { key: "applied", label: "Applied", icon: "ri-send-plane-line" },
  { key: "issued", label: "Issued", icon: "ri-mail-check-line" },
  { key: "processing", label: "Processing", icon: "ri-loader-4-line" },
  { key: "withdrawn", label: "Withdrawn", icon: "ri-arrow-go-back-line" },
  { key: "rejected", label: "Rejected", icon: "ri-close-circle-line" },
  { key: "granted", label: "Granted", icon: "ri-checkbox-circle-line" },
];
