import type { DetailDocEntry } from "../../types";
import { DOCUMENT_CATEGORIES } from "../../constants";

interface DocumentListProps {
  documents: DetailDocEntry[];
  categories: Record<string, string>;
  onCategoryChange: (filename: string, category: string) => void;
}

export function DocumentList({ documents, categories, onCategoryChange }: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-slate-500">No documents found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {documents.map((doc) => (
          <li
            key={doc.filename}
            className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
          >
            <span className="truncate" title={doc.name}>
              {doc.name}
            </span>
            <select
              value={categories[doc.filename] ?? "Manually Rename"}
              onChange={(e) => onCategoryChange(doc.filename, e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
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
