import { Routes, Route, Link } from "react-router-dom";
import { lazy, Suspense } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Joints from "./pages/Joints";
import AlertsPage from "./pages/AlertsPage";
const Analytics = lazy(() => import("./pages/Analytics"));
import LiveFeed from "./pages/LiveFeed";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <Topbar />

        <Suspense fallback={<p className="empty-state">Loading workspace…</p>}><Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/joints" element={<Joints />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/live-feed" element={<LiveFeed />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="empty-state"><p>Page not found</p><Link to="/">Return to dashboard</Link></div>} />
        </Routes></Suspense>
      </main>
    </div>
  );
}
