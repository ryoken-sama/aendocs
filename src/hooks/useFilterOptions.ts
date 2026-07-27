import { useEffect, useState } from "react";
import { getFilterOptions } from "../lib/tauri";
import type { FilterOptions } from "../types";

const EMPTY_OPTIONS: FilterOptions = { branch: [], agent: [], country: [], institution: [] };

/** Fetches the Branch/Agent/Country/Institution id->name mappings once, on
 * mount — the underlying command triggers login if there's no session yet,
 * so this doubles as the "after login" fetch the search screen needs. */
export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFilterOptions()
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, error };
}
