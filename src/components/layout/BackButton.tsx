import { useAppContext } from "../../context/AppContext";

/** A large, consistent way back to the Search (home) screen from anywhere
 * else in the app — the single navigation pattern non-technical staff need
 * to learn, always in the same spot at the top of the screen. */
export function BackButton() {
  const { goToSearch } = useAppContext();

  return (
    <button
      type="button"
      onClick={goToSearch}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-base font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ←
      </span>
      Back to Search
    </button>
  );
}
