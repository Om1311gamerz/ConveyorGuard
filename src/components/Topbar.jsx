import { useState } from "react";
import { Bell, Settings, User, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSensorData } from "../context/SensorContext";

export default function Topbar() {
  const navigate = useNavigate();
  const { sensorData } = useSensorData();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [];

  if (sensorData.vibration > 4.8) {
    notifications.push({
      title: "High Vibration Detected",
      message: `Vibration: ${sensorData.vibration} mm/s`,
      severity: "warning",
    });
  }

  if (sensorData.temperature > 42) {
    notifications.push({
      title: "High Temperature",
      message: `Temperature: ${sensorData.temperature} °C`,
      severity: "warning",
    });
  }

  if (sensorData.motorCurrent > 1.45) {
    notifications.push({
      title: "Motor Current Warning",
      message: `Current: ${sensorData.motorCurrent} A`,
      severity: "warning",
    });
  }

  if (sensorData.alignment > 1.0) {
    notifications.push({
      title: "Belt Misalignment",
      message: `Deviation: ${sensorData.alignment}`,
      severity: "warning",
    });
  }

  if (sensorData.healthScore < 60) {
    notifications.push({
      title: "Critical Conveyor Health",
      message: `Health score: ${sensorData.healthScore}/100`,
      severity: "critical",
    });
  }

  return (
    <div className="flex justify-between items-center mb-8 relative">
      <span className="text-green-400 font-semibold">
        ● Live
      </span>

      <div className="flex items-center gap-4">

        {/* Notification Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="relative p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <Bell size={22} />

            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#0D1728] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">

              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div>
                  <p className="font-semibold">
                    Notifications
                  </p>

                  <p className="text-xs text-gray-400">
                    Live conveyor alerts
                  </p>
                </div>

                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-green-400 font-medium">
                      System Normal
                    </p>

                    <p className="text-gray-500 text-sm mt-1">
                      No active alerts
                    </p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 border-b border-slate-800 last:border-none"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-2 w-2 h-2 rounded-full ${
                            notification.severity === "critical"
                              ? "bg-red-500"
                              : "bg-yellow-400"
                          }`}
                        />

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              notification.severity === "critical"
                                ? "text-red-400"
                                : "text-yellow-300"
                            }`}
                          >
                            {notification.title}
                          </p>

                          <p className="text-gray-400 text-xs mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  navigate("/alerts");
                  setShowNotifications(false);
                }}
                className="w-full py-3 text-sm text-blue-400 hover:bg-slate-800 transition border-t border-slate-700"
              >
                View All Alerts
              </button>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={() => navigate("/settings")}
          className="p-2 hover:bg-slate-800 rounded-lg transition"
        >
          <Settings size={22} />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="bg-purple-700 w-9 h-9 rounded-full flex items-center justify-center font-semibold hover:bg-purple-600 transition"
          >
            S
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-3 w-64 bg-[#0D1728] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">

              <div className="px-4 py-4 border-b border-slate-700">
                <p className="font-semibold">
                  SIH Operator
                </p>

                <p className="text-gray-400 text-xs mt-1">
                  ConveyorGuard Prototype
                </p>
              </div>

              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800 transition"
              >
                <User size={17} />
                Profile
              </button>

              <button
                onClick={() => {
                  navigate("/settings");
                  setShowProfile(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800 transition"
              >
                <Settings size={17} />
                Settings
              </button>

              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-800 transition border-t border-slate-700"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}