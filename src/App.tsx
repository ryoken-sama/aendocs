import { useState } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { StudentsProvider } from "./context/StudentsContext";
import { StudentListProvider } from "./context/StudentListContext";
import { UpdateProvider, useUpdateContext } from "./context/UpdateContext";
import { NavBar } from "./components/layout/NavBar";
import { Sidebar } from "./components/layout/Sidebar";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { SearchScreen } from "./components/search/SearchScreen";
import { DetailScreen } from "./components/detail/DetailScreen";
import { StudentsListScreen } from "./components/students-list/StudentsListScreen";
import { StudentDetailScreen } from "./components/students-list/StudentDetailScreen";
import { UpdateModal } from "./components/layout/UpdateModal";

function Screens() {
  const { screen } = useAppContext();

  switch (screen.name) {
    case "settings":
      return <SettingsScreen />;
    case "search":
      return <SearchScreen />;
    case "detail":
      return <DetailScreen student={screen.student} />;
    case "students-list":
      return <StudentsListScreen />;
    case "students-detail":
      return <StudentDetailScreen student={screen.student} />;
  }
}

function AppShell() {
  const { update, dismiss } = useUpdateContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {update && <UpdateModal update={update} onDismiss={dismiss} />}
      <NavBar />
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((c) => !c)} />
      <main
        className={`h-screen overflow-y-auto pt-14 transition-[padding-left] duration-200 ${
          sidebarCollapsed ? "pl-16" : "pl-56"
        }`}
      >
        <Screens />
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <StudentsProvider>
          <StudentListProvider>
            <UpdateProvider>
              <AppShell />
            </UpdateProvider>
          </StudentListProvider>
        </StudentsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
