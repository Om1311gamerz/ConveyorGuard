import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Joints from "./pages/Joints";
import AlertsPage from "./pages/AlertsPage";
import Analytics from "./pages/Analytics";
import LiveFeed from "./pages/LiveFeed";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="flex min-h-screen bg-[#050B18] text-white">
      <Sidebar />

      <main className="flex-1 p-6 overflow-x-hidden">
        <Topbar />

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/joints" element={<Joints />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/live-feed" element={<LiveFeed />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}