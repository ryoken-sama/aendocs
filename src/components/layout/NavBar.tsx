import { APP_NAME } from "../../constants";
import { useAppContext } from "../../context/AppContext";
import aenLogo from "../../assets/aen-logo.png";

export function NavBar() {
  const { screen, goToSettings } = useAppContext();

  return (
    <header className="grid grid-cols-3 items-center border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center">
        <img src={aenLogo} alt={APP_NAME} className="h-10 w-auto" />
      </div>

      <p className="text-center font-sans text-base font-bold text-white">
        AEN Document Manager
      </p>

      <div className="flex justify-end">
        {screen.name !== "settings" && (
          <button
            type="button"
            onClick={goToSettings}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink hover:bg-white/5"
          >
            Settings
          </button>
        )}
      </div>
    </header>
  );
}
