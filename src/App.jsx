import MapView from "./pages/MapView";
import "./styles/globals.css";

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <MapView />
      </main>
    </div>
  );
}