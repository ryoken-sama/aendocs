interface PaginatorProps {
  /** 0-indexed, matching StudentsContext's `page`. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const WINDOW_SIZE = 5;

/** Builds a 1-indexed page list like [1, "ellipsis", 6, 7, 8, 9, 10]: the
 * first and last page are always present, up to `WINDOW_SIZE` consecutive
 * pages are shown around the current one, and an ellipsis fills any gap —
 * but only when the gap is more than a single page (a lone skipped page is
 * just shown directly instead of "... N"). */
function buildPageList(current1: number, total1: number): (number | "ellipsis")[] {
  if (total1 <= WINDOW_SIZE) {
    return Array.from({ length: total1 }, (_, i) => i + 1);
  }

  const half = Math.floor(WINDOW_SIZE / 2);
  let start = current1 - half;
  let end = current1 + half;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > total1) {
    start -= end - total1;
    end = total1;
    if (start < 1) start = 1;
  }

  const pages: (number | "ellipsis")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total1) {
    if (end < total1 - 1) pages.push("ellipsis");
    pages.push(total1);
  }
  return pages;
}

const navButtonClass =
  "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-surface";

/** « ‹ 1 2 3 4 5 … 10 › » — server-side pagination controls: every click
 * hands a new 0-indexed page straight to StudentsContext's setPage, which
 * fetches that page fresh (see the skeleton loader in SearchScreen). */
export function Paginator({ page, totalPages, onPageChange, disabled }: PaginatorProps) {
  if (totalPages <= 1) return null;

  const current1 = page + 1;
  const pages = buildPageList(current1, totalPages);
  const atFirst = page === 0;
  const atLast = page + 1 >= totalPages;

  return (
    <nav className="mt-4 flex items-center gap-1.5 text-sm" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(0)}
        disabled={disabled || atFirst}
        aria-label="First page"
        className={navButtonClass}
      >
        «
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || atFirst}
        aria-label="Previous page"
        className={navButtonClass}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p - 1)}
            disabled={disabled}
            aria-label={`Page ${p}`}
            aria-current={p === current1 ? "page" : undefined}
            className={
              p === current1
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                : navButtonClass
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || atLast}
        aria-label="Next page"
        className={navButtonClass}
      >
        ›
      </button>
      <button
        type="button"
        onClick={() => onPageChange(totalPages - 1)}
        disabled={disabled || atLast}
        aria-label="Last page"
        className={navButtonClass}
      >
        »
      </button>
    </nav>
  );
}
