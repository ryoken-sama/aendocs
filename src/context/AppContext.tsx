import { createContext, useContext, useState, ReactNode } from "react";
import type { StudentSummary } from "../types";

export type Screen =
  | { name: "settings" }
  | { name: "search" }
  | { name: "detail"; student: StudentSummary };

interface AppContextValue {
  screen: Screen;
  goToSettings: () => void;
  goToSearch: () => void;
  goToDetail: (student: StudentSummary) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>({ name: "search" });

  const value: AppContextValue = {
    screen,
    goToSettings: () => setScreen({ name: "settings" }),
    goToSearch: () => setScreen({ name: "search" }),
    goToDetail: (student: StudentSummary) => setScreen({ name: "detail", student }),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
