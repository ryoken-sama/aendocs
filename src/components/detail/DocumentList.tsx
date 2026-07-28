import type { DetailDocEntry } from "../../types";

const MANUALLY_RENAME = "Manually Rename";

interface DocumentListProps {
  documents: DetailDocEntry[];
  /** Keyed by `doc.filename` — the dropdown's selected category, or the
   * "Manually Rename" sentinel when the staff member is typing a custom
   * name instead. */
  categories: Record<string, string>;
  /** Keyed by `doc.filename` — the free-text name typed while in "Manually
   * Rename" mode. Only meaningful when `categories[filename]` is the
   * sentinel above. */
  customNames: Record<string, string>;
  /** The country-specific (or generic-fallback) rename options — see
   * useDocumentCategories/document_categories.rs. Always ends with
   * "Manually Rename". */
  categoryOptions: string[];
  onCategoryChange: (filename: string, category: string) => void;
  onCustomNameChange: (filename: string, value: string) => void;
}

export function DocumentList({
  documents,
  categories,
  customNames,
  categoryOptions,
  onCategoryChange,
  onCustomNameChange,
}: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted">No documents found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <ul className="divide-y divide-border">
        {documents.map((doc) => {
          const selected = categories[doc.filename] ?? MANUALLY_RENAME;
          const isManual = selected === MANUALLY_RENAME;
          // A keyword-suggested category can, in principle, fall outside
          // this country's list (e.g. a rule fires but that category isn't
          // one of the country's options yet) — keep it selectable/visible
          // rather than letting the <select> silently show nothing.
          const options = categoryOptions.includes(selected) ? categoryOptions : [selected, ...categoryOptions];
          const firstRealCategory = options.find((o) => o !== MANUALLY_RENAME) ?? MANUALLY_RENAME;

          return (
            <li key={doc.filename} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-ink" title={doc.name}>
                {doc.filename}
              </span>

              {isManual ? (
                <div className="relative w-56 flex-shrink-0">
                  <input
                    type="text"
                    autoFocus
                    value={customNames[doc.filename] ?? ""}
                    onChange={(e) => onCustomNameChange(doc.filename, e.target.value)}
                    placeholder="Type a filename…"
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1 pr-7 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => onCategoryChange(doc.filename, firstRealCategory)}
                    title="Choose from category list instead"
                    aria-label="Choose from category list instead"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    ▾
                  </button>
                </div>
              ) : (
                <select
                  value={selected}
                  onChange={(e) => onCategoryChange(doc.filename, e.target.value)}
                  className="w-56 flex-shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary"
                >
                  {options.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
