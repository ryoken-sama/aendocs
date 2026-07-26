import { APP_NAME } from "../../constants";
import { useAppContext } from "../../context/AppContext";

export function NavBar() {
  const { screen, goToSearch, goToSettings } = useAppContext();

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">{APP_NAME}</h1>
      <nav className="flex gap-2">
        <button
          className={tabClass(screen.name === "search" || screen.name === "detail")}
          onClick={goToSearch}
        >
          Search
        </button>
        <button className={tabClass(screen.name === "settings")} onClick={goToSettings}>
          Settings
        </button>
      </nav>
    </header>
  );
}
