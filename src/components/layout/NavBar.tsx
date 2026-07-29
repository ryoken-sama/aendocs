import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import { useStudentListContext } from "../../context/StudentListContext";
import { SearchBar } from "../search/SearchBar";
import { ProfileMenu } from "./ProfileMenu";

const DEBOUNCE_MS = 300;

export function NavBar() {
  const { screen } = useAppContext();
  const studentsCtx = useStudentsContext();
  const studentListCtx = useStudentListContext();

  const isStudyAbroadSearch = screen.name === "search";
  const isStudentsListSearch = screen.name === "students-list";
  const showSearchBar = isStudyAbroadSearch || isStudentsListSearch;

  // Which context's query the search bar is currently bound to depends on
  // which of the two searchable screens is active.
  const activeQuery = isStudentsListSearch ? studentListCtx.query : studentsCtx.query;
  const setActiveQuery = isStudentsListSearch ? studentListCtx.setQuery : studentsCtx.setQuery;
  const setActivePage = isStudentsListSearch ? studentListCtx.setPage : studentsCtx.setPage;

  // The query itself now triggers a real server request (see
  // StudentsContext/StudentListContext), so typing is debounced locally
  // before it's pushed up — otherwise every keystroke would fire its own
  // request. `localValue` stays instantly responsive for the input; only
  // the committed value after a pause reaches the active context's query.
  const [localValue, setLocalValue] = useState(activeQuery);

  // Switching screens, the Study Abroad section, or the Students filter all
  // change which query is "active" directly, not via typing — snap the
  // input to match immediately rather than waiting out the debounce.
  useEffect(() => {
    setLocalValue(activeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name, studentsCtx.activeSection, studentListCtx.filter]);

  useEffect(() => {
    if (localValue === activeQuery) return;
    const timer = setTimeout(() => {
      setActiveQuery(localValue);
      setActivePage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 grid h-14 grid-cols-3 items-center border-b border-border bg-surface px-6">
      <div />

      <div className="flex justify-center">
        {showSearchBar && (
          <div className="w-full max-w-md">
            <SearchBar value={localValue} onChange={setLocalValue} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <ProfileMenu />
      </div>
    </header>
  );
}
