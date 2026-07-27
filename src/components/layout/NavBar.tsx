import { APP_NAME } from "../../constants";
import { useAppContext } from "../../context/AppContext";

export function NavBar() {
  const { screen, goToSettings } = useAppContext();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">{APP_NAME}</h1>
      {screen.name !== "settings" && (
        <button
          type="button"
          onClick={goToSettings}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Settings
        </button>
      )}
    </header>
  );
}
