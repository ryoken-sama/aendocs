import { SECTIONS } from "../../constants";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import type { SectionKey } from "../../types";
import aenLogo from "../../assets/aen-logo.png";
import accessIcon from "../../assets/access-icon.png";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Collapsible left-hand navigation between the 7 aenapply application-list
 * sections, styled after aenapply's own sidebar (logo top, grouped nav,
 * Settings pinned to the bottom). Mounted once at the App level (see
 * App.tsx), so collapsing it or switching sections never gets reset by
 * screen navigation. `collapsed` is lifted to App.tsx so the main content
 * area's left padding can track the sidebar's actual fixed width. */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { screen, goToSearch, goToSettings } = useAppContext();
  const { activeSection, setActiveSection } = useStudentsContext();

  function handleSelect(key: SectionKey) {
    setActiveSection(key);
    goToSearch();
  }

  function itemClass(active: boolean): string {
    return `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? "justify-center" : ""
    } ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-white/5 hover:text-ink"}`;
  }

  const settingsActive = screen.name === "settings";

  return (
    <nav
      className={`fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r border-border bg-surface pt-14 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div
        className={`flex items-center border-b border-border ${
          collapsed ? "flex-col gap-2 py-4" : "justify-between px-4 py-4"
        }`}
      >
        {collapsed ? (
          <img src={accessIcon} alt="AEN" className="h-8 w-8" />
        ) : (
          <img src={aenLogo} alt="AEN Education Network" className="h-8 w-auto" />
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-ink"
        >
          <i className={collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"} aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Document Manager
        </p>
      )}

      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {SECTIONS.map((section) => {
          const active = !settingsActive && activeSection === section.key;
          return (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => handleSelect(section.key)}
                title={collapsed ? section.label : undefined}
                aria-label={section.label}
                className={itemClass(active)}
              >
                <i className={`${section.icon} text-lg leading-none`} aria-hidden="true" />
                {!collapsed && <span>{section.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={goToSettings}
          title={collapsed ? "Settings" : undefined}
          aria-label="Settings"
          className={itemClass(settingsActive)}
        >
          <i className="ri-settings-3-line text-lg leading-none" aria-hidden="true" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </nav>
  );
}
