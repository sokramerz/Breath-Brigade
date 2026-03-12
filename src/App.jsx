import { useState } from "react";
import MapView from "./pages/MapView";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NavBar from "./components/NavBar";
import "./styles/globals.css";

// TODO: Replace with React Router for proper routing
// TODO: Add auth context/provider here once user login is implemented

export default function App() {
  const [activePage, setActivePage] = useState("map");

  return (
    <div className="app-shell">
      <main className="app-main">
        {activePage === "map"       && <MapView />}
        {activePage === "dashboard" && <Dashboard />}
        {activePage === "profile"   && <Profile />}
      </main>
      <NavBar activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}
