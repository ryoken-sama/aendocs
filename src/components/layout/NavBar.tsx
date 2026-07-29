import { APP_NAME } from "../../constants";
import { ProfileMenu } from "./ProfileMenu";

/** A slim, purely static top bar now — navigation lives in the sidebar
 * (including the home button, see Sidebar's logo) and the free-text search
 * box lives inline in SearchScreen/StudentsListScreen, so this is just the
 * app title plus the profile menu. */
export function NavBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 grid h-14 grid-cols-3 items-center border-b border-border bg-surface px-6">
      <div />

      <p className="text-center font-sans text-sm font-medium text-ink">{APP_NAME}</p>

      <div className="flex justify-end">
        <ProfileMenu />
      </div>
    </header>
  );
}
