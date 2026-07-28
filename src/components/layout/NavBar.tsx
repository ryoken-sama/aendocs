import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import { SearchBar } from "../search/SearchBar";

const DEBOUNCE_MS = 300;

export function NavBar() {
  const { screen, goToSettings } = useAppContext();
  const { activeSection, query, setQuery, setPage } = useStudentsContext();

  // The query itself now triggers a real server request (see
  // StudentsContext), so typing is debounced locally before it's pushed up
  // — otherwise every keystroke would fire its own request. `localValue`
  // stays instantly responsive for the input; only the committed value
  // after a pause reaches context.query.
  const [localValue, setLocalValue] = useState(query);

  // Section switches (or returning from Detail) change context.query
  // directly, not via typing — snap the input to match immediately rather
  // than waiting out the debounce.
  useEffect(() => {
    setLocalValue(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (localValue === query) return;
    const timer = setTimeout(() => {
      setQuery(localValue);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 grid h-14 grid-cols-3 items-center border-b border-border bg-surface px-6">
      <div />

      <div className="flex justify-center">
        {screen.name === "search" && (
          <div className="w-full max-w-md">
            <SearchBar value={localValue} onChange={setLocalValue} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {screen.name !== "settings" && (
          <button
            type="button"
            onClick={goToSettings}
            aria-label="Settings"
            title="Settings"
            className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-ink"
          >
            <i className="ri-settings-3-line text-lg leading-none" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
