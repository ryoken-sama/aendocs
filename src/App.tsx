import { AppProvider, useAppContext } from "./context/AppContext";
import { NavBar } from "./components/layout/NavBar";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { SearchScreen } from "./components/search/SearchScreen";
import { DetailScreen } from "./components/detail/DetailScreen";

function Screens() {
  const { screen } = useAppContext();

  switch (screen.name) {
    case "settings":
      return <SettingsScreen />;
    case "search":
      return <SearchScreen />;
    case "detail":
      return <DetailScreen studentId={screen.studentId} />;
  }
}

function App() {
  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1">
          <Screens />
        </main>
      </div>
    </AppProvider>
  );
}

export default App;
