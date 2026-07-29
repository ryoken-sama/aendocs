import { useState } from "react";
import { SECTIONS } from "../../constants";
import { useAppContext } from "../../context/AppContext";
import { useStudentsContext } from "../../context/StudentsContext";
import { useStudentListContext } from "../../context/StudentListContext";
import { useFilterOptions } from "../../hooks/useFilterOptions";
import type { FilterOption, SectionKey, StudentsFilterSelection } from "../../types";
import aenLogo from "../../assets/aen-logo.png";
import accessIcon from "../../assets/access-icon.png";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

type ExpandableGroupKey = "branch" | "agent" | "country";

interface ExpandableGroupDef {
  key: ExpandableGroupKey;
  label: string;
  icon: string;
  items: FilterOption[];
}

/** Collapsible left-hand navigation with two groups: "Students" (a roster
 * browsable by branch/agent/country, expandable submenus populated from the
 * already-fetched filter dropdown lists) and "Study Abroad" (the 7
 * aenapply application-list sections). Mounted once at the App level (see
 * App.tsx), so collapsing it or switching sections/filters never gets reset
 * by screen navigation. `collapsed` is lifted to App.tsx so the main
 * content area's left padding can track the sidebar's actual fixed width. */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { screen, goToSearch, goToStudentsList, goToSettings } = useAppContext();
  const { activeSection, setActiveSection } = useStudentsContext();
  const { filter: studentsFilter, setFilter: setStudentsFilter } = useStudentListContext();
  const { options: filterOptions } = useFilterOptions();
  const [expandedGroup, setExpandedGroup] = useState<ExpandableGroupKey | null>(null);

  function handleSelectSection(key: SectionKey) {
    setActiveSection(key);
    goToSearch();
  }

  function handleSelectStudentsFilter(next: StudentsFilterSelection) {
    setStudentsFilter(next);
    goToStudentsList();
  }

  function handleToggleGroup(group: ExpandableGroupKey) {
    if (collapsed) {
      // No room to show a submenu while collapsed — expand the sidebar
      // itself first, already opened to this group.
      onToggleCollapsed();
      setExpandedGroup(group);
      return;
    }
    setExpandedGroup((current) => (current === group ? null : group));
  }

  function itemClass(active: boolean): string {
    return `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? "justify-center" : ""
    } ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-white/5 hover:text-ink"}`;
  }

  const studentsListActive = screen.name === "students-list" || screen.name === "students-detail";
  const studyAbroadActive = screen.name === "search" || screen.name === "detail";
  const settingsActive = screen.name === "settings";

  const expandableGroups: ExpandableGroupDef[] = [
    { key: "branch", label: "By Branch", icon: "ri-building-4-line", items: filterOptions.branch },
    { key: "agent", label: "By Agent", icon: "ri-user-star-line", items: filterOptions.agent },
    { key: "country", label: "By Country", icon: "ri-earth-line", items: filterOptions.country },
  ];

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

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {!collapsed && (
          <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Students</p>
        )}

        <button
          type="button"
          onClick={() => handleSelectStudentsFilter({ type: "all" })}
          title={collapsed ? "All Students" : undefined}
          aria-label="All Students"
          className={itemClass(studentsListActive && studentsFilter.type === "all")}
        >
          <i className="ri-team-line text-lg leading-none" aria-hidden="true" />
          {!collapsed && <span>All Students</span>}
        </button>

        {expandableGroups.map((group) => {
          const isExpanded = !collapsed && expandedGroup === group.key;
          const isGroupActive = studentsListActive && studentsFilter.type === group.key;

          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => handleToggleGroup(group.key)}
                title={collapsed ? group.label : undefined}
                aria-label={group.label}
                aria-expanded={isExpanded}
                className={itemClass(isGroupActive && !isExpanded)}
              >
                <i className={`${group.icon} text-lg leading-none`} aria-hidden="true" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    <i
                      className={`ri-arrow-down-s-line text-base transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>

              {isExpanded && (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-border py-1 pl-2">
                  {group.items.length === 0 ? (
                    <p className="px-3 py-1.5 text-xs text-muted">None loaded yet</p>
                  ) : (
                    group.items.map((item) => {
                      const active = isGroupActive && studentsFilter.type === group.key && studentsFilter.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectStudentsFilter({ type: group.key, id: item.id, label: item.name })}
                          title={item.name}
                          className={`truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                            active ? "bg-primary/10 text-primary" : "text-muted hover:bg-white/5 hover:text-ink"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!collapsed && (
          <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Study Abroad</p>
        )}

        {SECTIONS.map((section) => {
          const active = studyAbroadActive && activeSection === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => handleSelectSection(section.key)}
              title={collapsed ? section.label : undefined}
              aria-label={section.label}
              className={itemClass(active)}
            >
              <i className={`${section.icon} text-lg leading-none`} aria-hidden="true" />
              {!collapsed && <span>{section.label}</span>}
            </button>
          );
        })}
      </div>

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
