import { useEffect, useState } from "react";
import { getDocumentCategories } from "../lib/tauri";

/** Fetches the rename-dropdown options for a student's country — see
 * `document_categories.rs` for how the country -> list mapping (and the
 * generic-list fallback) is resolved. Refetches whenever `country` changes,
 * since DetailScreen is remounted per student and countries differ. */
export function useDocumentCategories(country: string) {
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDocumentCategories(country)
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return { categories, error };
}
