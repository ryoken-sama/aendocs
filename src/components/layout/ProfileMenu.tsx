import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { getUserProfile, logout } from "../../lib/tauri";
import { useAuthContext } from "../../context/AuthContext";
import type { UserProfile } from "../../types";

const PORTAL_URL = "https://aenapply.com";

/** Replaces the navbar's old Settings shortcut — a circular avatar button
 * (falling back to a generic person icon when there's no photo, or before
 * the profile fetch resolves) that opens a small dropdown with the user's
 * name, a link to the live aenapply portal, and logout. */
export function ProfileMenu() {
  const { signOut } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch(() => {
        // Fetching the profile is best-effort — the avatar just falls back
        // to the generic icon and the dropdown shows no name.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function handleOpenPortal() {
    setIsOpen(false);
    open(PORTAL_URL);
  }

  function handleLogout() {
    setIsOpen(false);
    logout()
      .catch(() => {
        // Logging out is a local session clear on our side regardless —
        // still return to the Login screen even if the command itself
        // failed.
      })
      .finally(() => {
        signOut();
      });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Profile menu"
        aria-expanded={isOpen}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-muted hover:border-primary hover:text-ink"
      >
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <i className="ri-user-line text-lg leading-none" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <p className="truncate px-3 py-2 text-sm text-muted" title={profile?.name}>
            {profile?.name || "—"}
          </p>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={handleOpenPortal}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-white/5"
          >
            <i className="ri-external-link-line text-base" aria-hidden="true" />
            Open Portal
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-white/5"
          >
            <i className="ri-logout-box-r-line text-base" aria-hidden="true" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
