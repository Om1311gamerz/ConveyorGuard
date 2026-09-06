import { useEffect, useState } from "react";

import {
  TriangleAlert,
  CircleAlert,
  CircleCheck,
  Clock,
} from "lucide-react";

import { useSensorData } from "../context/SensorContext";

export default function AlertsPage() {
  const { sensorData } = useSensorData();

  const [alertHistory, setAlertHistory] = useState([]);

  useEffect(() => {
    const newAlerts = [];

    if (sensorData.vibration > 4.8) {
      newAlerts.push({
        type: "High Vibration",
        message: `Vibration reached ${sensorData.vibration} mm/s`,
        severity: "Warning",
      });
    }

    if (sensorData.temperature > 42) {
      newAlerts.push({
        type: "High Temperature",
        message: `Joint temperature reached ${sensorData.temperature} °C`,
        severity: "Warning",
      });
    }

    if (sensorData.motorCurrent > 1.45) {
      newAlerts.push({
        type: "Motor Overload",
        message: `Motor current reached ${sensorData.motorCurrent} A`,
        severity: "Warning",
      });
    }

    if (sensorData.alignment > 1.0) {
      newAlerts.push({
        type: "Belt Misalignment",
        message: `Alignment deviation reached ${sensorData.alignment} mm`,
        severity: "Warning",
      });
    }

    if (sensorData.healthScore < 60) {
      newAlerts.push({
        type: "Critical Conveyor Health",
        message: `Health score dropped to ${sensorData.healthScore}/100`,
        severity: "Critical",
      });
    }

    if (newAlerts.length === 0) return;

    const time = new Date().toLocaleTimeString();

    const timestampedAlerts = newAlerts.map((alert) => ({
      ...alert,
      id: `${Date.now()}-${alert.type}`,
      time,
    }));

    setAlertHistory((previous) => {
      const updated = [
        ...timestampedAlerts,
        ...previous,
      ];

      return updated.slice(0, 30);
    });
  }, [sensorData]);

  const criticalCount = alertHistory.filter(
    (alert) => alert.severity === "Critical"
  ).length;

  const warningCount = alertHistory.filter(
    (alert) => alert.severity === "Warning"
  ).length;

  const getAlertStyle = (severity) => {
    if (severity === "Critical") {
      return {
        border: "border-red-500/30",
        background: "bg-red-500/10",
        text: "text-red-400",
      };
    }

    return {
      border: "border-yellow-500/30",
      background: "bg-yellow-500/10",
      text: "text-yellow-400",
    };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Alert History
        </h1>

        <p className="text-gray-400 mt-1">
          Recorded conveyor faults and condition warnings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-[#0D1728] border border-red-500/20 rounded-xl p-5">

          <div className="flex items-center gap-3">
            <CircleAlert className="text-red-400" />

            <div>
              <p className="text-gray-400 text-sm">
                Critical Events
              </p>

              <h2 className="text-3xl font-bold text-red-400">
                {criticalCount}
              </h2>
            </div>
          </div>

        </div>

        <div className="bg-[#0D1728] border border-yellow-500/20 rounded-xl p-5">

          <div className="flex items-center gap-3">
            <TriangleAlert className="text-yellow-400" />

            <div>
              <p className="text-gray-400 text-sm">
                Warning Events
              </p>

              <h2 className="text-3xl font-bold text-yellow-400">
                {warningCount}
              </h2>
            </div>
          </div>

        </div>

        <div className="bg-[#0D1728] border border-green-500/20 rounded-xl p-5">

          <div className="flex items-center gap-3">
            <CircleCheck className="text-green-400" />

            <div>
              <p className="text-gray-400 text-sm">
                System Health
              </p>

              <h2
                className={`text-xl font-bold ${
                  sensorData.status === "Healthy"
                    ? "text-green-400"
                    : sensorData.status === "Warning"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {sensorData.status}
              </h2>
            </div>
          </div>

        </div>

      </div>

      <div className="bg-[#0D1728] border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800 flex justify-between items-center">

          <div>
            <h2 className="text-lg font-semibold">
              Event Log
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Latest 30 detected events
            </p>
          </div>

          <button
            onClick={() => setAlertHistory([])}
            className="text-sm text-red-400 border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            Clear History
          </button>

        </div>

        <div className="p-5">

          {alertHistory.length === 0 ? (

            <div className="text-center py-14">

              <CircleCheck
                size={45}
                className="text-green-400 mx-auto mb-3"
              />

              <p className="text-green-400 font-semibold">
                No alerts recorded
              </p>

              <p className="text-gray-500 text-sm mt-1">
                Sensor events will automatically appear here
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {alertHistory.map((alert) => {
                const style = getAlertStyle(alert.severity);

                return (
                  <div
                    key={alert.id}
                    className={`border ${style.border} ${style.background} rounded-xl p-4`}
                  >

                    <div className="flex justify-between gap-4">

                      <div className="flex gap-3">

                        <TriangleAlert
                          className={`${style.text} shrink-0`}
                        />

                        <div>

                          <div className="flex items-center gap-3">

                            <p className={`font-semibold ${style.text}`}>
                              {alert.type}
                            </p>

                            <span className="text-xs bg-slate-900 px-2 py-1 rounded">
                              {alert.severity}
                            </span>

                          </div>

                          <p className="text-gray-300 text-sm mt-2">
                            {alert.message}
                          </p>

                        </div>

                      </div>

                      <div className="flex items-center gap-2 text-gray-500 text-xs whitespace-nowrap">

                        <Clock size={14} />

                        {alert.time}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          )}

        </div>

      </div>
    </div>
  );
}