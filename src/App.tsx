import { AppProvider, useAppContext } from "./context/AppContext";
import { NavBar } from "./components/layout/NavBar";
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

  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col">
        {update && <UpdateModal update={update} onDismiss={dismiss} />}
        <NavBar />
        <main className="flex-1">
          <Screens />
        </main>
      </div>
    </AppProvider>
  );
}

export default App;
