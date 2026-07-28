import { useState } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { StudentsProvider } from "./context/StudentsContext";
import { NavBar } from "./components/layout/NavBar";
import { Sidebar } from "./components/layout/Sidebar";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { SearchScreen } from "./components/search/SearchScreen";
import { DetailScreen } from "./components/detail/DetailScreen";
import { UpdateModal } from "./components/layout/UpdateModal";
import { useUpdateCheck } from "./hooks/useUpdateCheck";

function Screens() {
  const { screen } = useAppContext();

  switch (screen.name) {
    case "settings":
      return <SettingsScreen />;
    case "search":
      return <SearchScreen />;
    case "detail":
      return <DetailScreen student={screen.student} />;
  }
}

function App() {
  const { update, dismiss } = useUpdateCheck();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <AppProvider>
        <StudentsProvider>
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
        </StudentsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
