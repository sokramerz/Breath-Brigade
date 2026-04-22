import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapView from "./pages/MapView";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NavBar from "./components/NavBar";
import "./styles/globals.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}