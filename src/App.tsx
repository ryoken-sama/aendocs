import { useState } from "react";
import { useAppContext } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useUpdateContext } from "./context/UpdateContext";
import { NavBar } from "./components/layout/NavBar";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardScreen } from "./components/dashboard/DashboardScreen";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { SearchScreen } from "./components/search/SearchScreen";
import { DetailScreen } from "./components/detail/DetailScreen";
import { StudentsListScreen } from "./components/students-list/StudentsListScreen";
import { StudentDetailScreen } from "./components/students-list/StudentDetailScreen";
import { UpdateModal } from "./components/layout/UpdateModal";
import { AuthGate } from "./components/auth/AuthGate";

function Screens() {
  const { screen } = useAppContext();

  switch (screen.name) {
    case "dashboard":
      return <DashboardScreen />;
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
      <AuthGate>
        <AppShell />
      </AuthGate>
    </ThemeProvider>
  );
}

export default App;
