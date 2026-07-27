import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getThemePreference, saveThemePreference } from "../lib/tauri";

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Loads the persisted theme preference once on mount (defaulting to dark
 * mode until that resolves) and reflects it as a `data-theme` attribute on
 * `<html>` — the CSS variables driving every themed color live off that
 * attribute, so this is the one place that needs to run at app startup,
 * before any particular screen mounts. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getThemePreference()
      .then((pref) => {
        if (!cancelled) setDarkModeState(pref.dark_mode);
      })
      .catch(() => {
        // Keep the default (dark) if the preference can't be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function setDarkMode(value: boolean) {
    setDarkModeState(value);
    saveThemePreference({ dark_mode: value }).catch(() => {
      // Best-effort persistence — the UI already reflects the choice either way.
    });
  }

  return <ThemeContext.Provider value={{ darkMode, setDarkMode }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
