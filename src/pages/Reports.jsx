import { useEffect, useState } from "react";

import {
  FileText,
  Activity,
  Thermometer,
  Gauge,
  MoveHorizontal,
  HeartPulse,
  AlertTriangle,
} from "lucide-react";

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/reports/summary"
        );

        if (!response.ok) {
          throw new Error("Failed to load report");
        }

        const data = await response.json();

        setReport(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Backend report data could not be loaded.");
        setLoading(false);
      }
    };

    fetchReport();

    const interval = setInterval(fetchReport, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-gray-400">
        Loading report data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
        <p className="text-red-400 font-semibold">
          Report unavailable
        </p>

        <p className="text-gray-400 text-sm mt-1">
          {error}
        </p>
      </div>
    );
  }

  const summary = report?.summary || {};

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          System Reports
        </h1>

        <p className="text-gray-400 mt-1">
          Historical summary for prototype CB-01
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex gap-3">
        <FileText
          className="text-blue-400 shrink-0"
          size={21}
        />

        <div>
          <p className="text-blue-400 font-semibold">
            Database Report
          </p>

          <p className="text-gray-400 text-sm mt-1">
            These values are calculated from sensor readings stored
            in SQLite and refresh every 5 seconds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <ReportCard
          icon={<FileText />}
          title="Stored Readings"
          value={summary.totalReadings ?? 0}
          subtitle="SQLite records"
        />

        <ReportCard
          icon={<Activity />}
          title="Average Vibration"
          value={`${summary.avgVibration ?? 0} mm/s`}
          subtitle={`Peak: ${summary.maxVibration ?? 0} mm/s`}
        />

        <ReportCard
          icon={<Thermometer />}
          title="Average Temperature"
          value={`${summary.avgTemperature ?? 0} °C`}
          subtitle={`Peak: ${summary.maxTemperature ?? 0} °C`}
        />

        <ReportCard
          icon={<Gauge />}
          title="Average Motor Current"
          value={`${summary.avgMotorCurrent ?? 0} A`}
          subtitle={`Peak: ${summary.maxMotorCurrent ?? 0} A`}
        />

        <ReportCard
          icon={<MoveHorizontal />}
          title="Average Alignment"
          value={`${summary.avgAlignment ?? 0} mm`}
          subtitle={`Peak: ${summary.maxAlignment ?? 0} mm`}
        />

        <ReportCard
          icon={<HeartPulse />}
          title="Average Health"
          value={`${summary.avgHealth ?? 0}/100`}
          subtitle={`Lowest: ${summary.lowestHealth ?? 0}/100`}
        />

        <ReportCard
          icon={<AlertTriangle />}
          title="Recorded Modes"
          value={report?.operatingModes?.length ?? 0}
          subtitle="Simulation operating states"
        />
      </div>

      <div className="bg-[#0D1728] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold">
            Operating Mode Distribution
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Number of stored readings generated in each demo mode
          </p>
        </div>

        <div className="p-5">
          {report?.operatingModes?.length > 0 ? (
            <div className="space-y-4">
              {report.operatingModes.map((mode) => {
                const total =
                  summary.totalReadings || 1;

                const percentage = Math.round(
                  (mode.count / total) * 100
                );

                const barColor =
                  mode.simulationMode === "NORMAL"
                    ? "bg-green-400"
                    : mode.simulationMode === "WARNING"
                    ? "bg-yellow-400"
                    : mode.simulationMode === "CRITICAL"
                    ? "bg-red-400"
                    : "bg-blue-400";

                return (
                  <div key={mode.simulationMode}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {mode.simulationMode}
                      </span>

                      <span className="text-gray-400 text-sm">
                        {mode.count} readings
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor}`}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <p className="text-gray-500 text-xs mt-1">
                      {percentage}% of stored data
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">
              No operating mode data available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  icon,
  title,
  value,
  subtitle,
}) {
  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
      <div className="text-blue-400 mb-4">
        {icon}
      </div>

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>

      <p className="text-xs text-gray-500 mt-2">
        {subtitle}
      </p>
    </div>
  );
}