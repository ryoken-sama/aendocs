import { useEffect, useState } from "react";

const DEBOUNCE_MS = 300;

/**
 * Keeps a search `<input>` instantly responsive while debouncing the
 * actual committed value pushed up to the given context setters — the
 * query itself triggers a real server request, so firing one per
 * keystroke would be wasteful. Used identically by SearchScreen (against
 * StudentsContext) and StudentsListScreen (against StudentListContext).
 *
 * `resetKey` is whatever identifies "what we're currently viewing" for
 * that context (the active section / the active Students filter) — when
 * it changes, the input snaps to the new context's query immediately
 * instead of waiting out the debounce, since that's an external switch,
 * not something the user just typed.
 */
export function useDebouncedSearchInput(
  query: string,
  setQuery: (value: string) => void,
  setPage: (updater: number | ((prev: number) => number)) => void,
  resetKey: unknown,
) {
  const [localValue, setLocalValue] = useState(query);

  useEffect(() => {
    setLocalValue(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (localValue === query) return;
    const timer = setTimeout(() => {
      setQuery(localValue);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  return [localValue, setLocalValue] as const;
}
