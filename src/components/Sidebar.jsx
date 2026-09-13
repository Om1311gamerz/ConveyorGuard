import { LayoutDashboard, TriangleAlert, BarChart3, Camera, FileText, Settings, Activity, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSensorData } from "../context/SensorContext";
import { Badge } from "./UI";

export default function Sidebar() {
  const { backendConnected, operationMode, snapshot } = useSensorData();
  const menu = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Joints", path: "/joints", icon: Activity },
    { name: "Alerts", path: "/alerts", icon: TriangleAlert },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Live Feed", path: "/live-feed", icon: Camera },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];
  return <aside className="app-sidebar">
    <div className="brand"><div className="brand-mark"><ShieldCheck size={23} /></div><div><span>ConveyorGuard</span><small>INTELLIGENT CONDITION MONITORING</small></div></div>
    <p className="nav-label">WORKSPACE / CB-01</p>
    <nav aria-label="Main navigation">{menu.map(({ name, path, icon: Icon }) => <NavLink end={path === "/"} key={path} to={path} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}><Icon size={18} /><span>{name}</span></NavLink>)}</nav>
    <div className="sidebar-status"><p className="eyebrow">LOCAL SYSTEM</p><div><span>API connection</span><Badge status={backendConnected ? "CONNECTED" : "OFFLINE"} /></div><div><span>ESP32 stream</span><Badge status={backendConnected && snapshot?.hardware?.connected ? "CONNECTED" : "UNKNOWN"}>{backendConnected && snapshot?.hardware?.connected ? "LIVE" : "WAITING"}</Badge></div><div><span>Monitoring</span><Badge status={operationMode === "SIMULATION" ? "SIMULATION" : "UNKNOWN"}>{operationMode}</Badge></div><p>SIH engineering prototype<br />Heuristic condition assessment</p></div>
  </aside>;
}
