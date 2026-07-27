import type { DetailDocEntry } from "../../types";
import { DOCUMENT_CATEGORIES } from "../../constants";

interface DocumentListProps {
  documents: DetailDocEntry[];
  categories: Record<string, string>;
  onCategoryChange: (filename: string, category: string) => void;
}

export function DocumentList({ documents, categories, onCategoryChange }: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted">No documents found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <ul className="divide-y divide-border">
        {documents.map((doc) => (
          <li
            key={doc.filename}
            className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
          >
            <span className="truncate text-ink" title={doc.name}>
              {doc.name}
            </span>
            <select
              value={categories[doc.filename] ?? "Manually Rename"}
              onChange={(e) => onCategoryChange(doc.filename, e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary"
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
