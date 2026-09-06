import {
  TriangleAlert,
  CircleCheck,
} from "lucide-react";

import { useSensorData } from "../context/SensorContext";

export default function Alerts() {
  const { sensorData } = useSensorData();

  const alerts = [];

  if (sensorData.vibration > 4.8) {
    alerts.push({
      title: "High Vibration",
      description: `Vibration reached ${sensorData.vibration} mm/s`,
      severity: "warning",
    });
  }

  if (sensorData.temperature > 42) {
    alerts.push({
      title: "High Temperature",
      description: `Joint temperature reached ${sensorData.temperature} °C`,
      severity: "warning",
    });
  }

  if (sensorData.motorCurrent > 1.45) {
    alerts.push({
      title: "Motor Load Increased",
      description: `Motor current reached ${sensorData.motorCurrent} A`,
      severity: "warning",
    });
  }

  if (sensorData.alignment > 1.0) {
    alerts.push({
      title: "Belt Misalignment",
      description: `Alignment deviation reached ${sensorData.alignment} mm`,
      severity: "warning",
    });
  }

  if (sensorData.healthScore < 60) {
    alerts.unshift({
      title: "Critical Conveyor Health",
      description: `Health score dropped to ${sensorData.healthScore}/100`,
      severity: "critical",
    });
  }

  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold text-lg">
            Live Alerts
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Automatically generated from sensor thresholds
          </p>
        </div>

        <span
          className={`text-sm font-semibold ${
            alerts.length === 0
              ? "text-green-400"
              : "text-yellow-400"
          }`}
        >
          {alerts.length} Active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex gap-3 items-center py-6">
          <CircleCheck className="text-green-400" />

          <div>
            <p className="text-green-400 font-medium">
              System Normal
            </p>

            <p className="text-gray-500 text-sm mt-1">
              No active sensor warnings detected
            </p>
          </div>
        </div>
      ) : (
        <div>
          {alerts.map((alert, index) => {
            const critical = alert.severity === "critical";

            return (
              <div
                key={index}
                className="flex gap-4 py-4 border-b border-slate-800 last:border-0"
              >
                <TriangleAlert
                  className={
                    critical
                      ? "text-red-400 shrink-0"
                      : "text-yellow-400 shrink-0"
                  }
                />

                <div>
                  <p
                    className={
                      critical
                        ? "text-red-400 font-medium"
                        : "text-yellow-400 font-medium"
                    }
                  >
                    {alert.title}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    {alert.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}