import {
  LayoutDashboard,
  TriangleAlert,
  BarChart3,
  Camera,
  FileText,
  Settings,
  Activity,
} from "lucide-react";

import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menu = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Joints", path: "/joints", icon: Activity },
    { name: "Alerts", path: "/alerts", icon: TriangleAlert },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Live Feed", path: "/live-feed", icon: Camera },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#07111f] border-r border-slate-800 p-5">
      <h1 className="text-2xl font-bold text-green-400 mb-10">
        ConveyorGuard
      </h1>

      <nav className="space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-green-500/10 text-green-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-12 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2">System Status</p>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-green-400 font-semibold">
            Online
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          All systems operational
        </p>
      </div>
    </aside>
  );
}