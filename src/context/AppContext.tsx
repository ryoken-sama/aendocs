import { createContext, useContext, useState, ReactNode } from "react";
import type { StudentListEntry, StudentSummary } from "../types";

export type Screen =
  | { name: "dashboard" }
  | { name: "settings" }
  | { name: "search" }
  | { name: "detail"; student: StudentSummary }
  | { name: "students-list" }
  | { name: "students-detail"; student: StudentListEntry };

const HOME_SCREEN: Screen = { name: "dashboard" };

interface AppContextValue {
  screen: Screen;
  goToDashboard: () => void;
  goToSettings: () => void;
  goToSearch: () => void;
  goToDetail: (student: StudentSummary) => void;
  goToStudentsList: () => void;
  goToStudentDetail: (student: StudentListEntry) => void;
  /** Undoes the most recent "drill deeper" navigation (into Settings, an
   * application's detail, or a student's detail) — back to whichever
   * screen that was opened from, however many levels deep that chain
   * goes (e.g. a Students-list filter -> a student's detail -> one of
   * their applications' detail -> back -> back unwinds both steps). Falls
   * back to the Dashboard home screen if there's nothing to unwind. */
  goBack: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>(HOME_SCREEN);
  // A real stack, not just a single "previous screen" slot — this app can
  // nest two levels deep (students-list -> students-detail -> detail), and
  // a single slot can't correctly unwind both. Only ever updated
  // functionally (via `prev`), so its current value is never read directly.
  const [, setHistory] = useState<Screen[]>([]);

  // "Drill deeper": entering a sub-screen (Settings, or a detail view)
  // reached from wherever we currently are — pushes the current screen so
  // goBack() can return to it.
  function pushAndGoTo(next: Screen) {
    setHistory((prev) => [...prev, screen]);
    setScreen(next);
  }

  // A fresh top-level jump (sidebar navigation) — not something "back"
  // should undo into, so any in-progress drill-down is discarded.
  function resetGoTo(next: Screen) {
    setHistory([]);
    setScreen(next);
  }

  function goBack() {
    setHistory((prev) => {
      if (prev.length === 0) {
        setScreen(HOME_SCREEN);
        return prev;
      }
      setScreen(prev[prev.length - 1]);
      return prev.slice(0, -1);
    });
  }

  const value: AppContextValue = {
    screen,
    goToDashboard: () => resetGoTo({ name: "dashboard" }),
    goToSettings: () => pushAndGoTo({ name: "settings" }),
    goToSearch: () => resetGoTo({ name: "search" }),
    goToDetail: (student: StudentSummary) => pushAndGoTo({ name: "detail", student }),
    goToStudentsList: () => resetGoTo({ name: "students-list" }),
    goToStudentDetail: (student: StudentListEntry) => pushAndGoTo({ name: "students-detail", student }),
    goBack,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
