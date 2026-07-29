import { useAppContext } from "../../context/AppContext";

/** A large, consistent way back to wherever the current screen was opened
 * from — the single navigation pattern non-technical staff need to learn,
 * always in the same spot at the top of the screen. Uses goBack() (a real
 * navigation stack, see AppContext) rather than always jumping to the
 * Study Abroad search screen, so it correctly returns to All Students, a
 * specific By Branch filter, Settings' opener, etc. */
export function BackButton() {
  const { goBack } = useAppContext();

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-primary hover:bg-primary/10"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ←
      </span>
      Back
    </button>
  );
}
