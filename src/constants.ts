import type { SectionKey } from "./types";

export const APP_NAME = "AEN Document Manager";

export interface SectionDef {
  key: SectionKey;
  label: string;
  /** Remixicon class, e.g. "ri-file-list-3-line". */
  icon: string;
}

/** The 7 "Study Abroad" sidebar sections, in display order. Each maps to
 * its own aenapply.com `/offerapplications[...]` DataTables endpoint — see
 * `Section::url`/`Section::columns` in the Rust backend. `key` must stay in
 * sync with `Section::from_key`; only `label` is display text. */
export const SECTIONS: SectionDef[] = [
  { key: "applications", label: "Student Applications", icon: "ri-file-list-3-line" },
  { key: "applied", label: "Offer Applied", icon: "ri-send-plane-line" },
  { key: "issued", label: "Offer Issued", icon: "ri-mail-check-line" },
  { key: "processing", label: "Processing", icon: "ri-loader-4-line" },
  { key: "withdrawn", label: "Visa Withdraw", icon: "ri-arrow-go-back-line" },
  { key: "rejected", label: "Visa Rejected", icon: "ri-close-circle-line" },
  { key: "granted", label: "Visa Granted", icon: "ri-checkbox-circle-line" },
];
