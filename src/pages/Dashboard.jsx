import Alerts from "../components/Alert";
import BeltTrackerCard from "../components/BeltTrackerCard";
import CameraCard from "../components/CameraCard";
import Charts from "../components/Chart";
import HardwareDiagnosticsCard from "../components/HardwareDiagnosticsCard";
import HealthCard from "../components/HealthCard";
import JointTable from "../components/JointTable";

import VisionCard from "../components/VisionCard";
import { useSensorData } from "../context/SensorContext";

function SummaryCard({ label, value, unit, source, valueClass = "text-white", sourceClass = "text-slate-500" }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0D1728] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>
        {value}
        {unit && <span className="ml-1 text-lg font-medium text-slate-500">{unit}</span>}
      </p>
      <p className={`mt-2 text-sm ${sourceClass}`}>{source}</p>
    </div>
  );
}

export default function Dashboard() {
  const {
    sensorData,
    simulationMode,
    setSimulationMode,
    backendConnected,
  } = useSensorData();

  const healthClass =
    sensorData.healthScore >= 80
      ? "text-emerald-400"
      : sensorData.healthScore >= 60
        ? "text-amber-400"
        : "text-red-400";

  const riskClass =
    sensorData.failureRisk === "LOW"
      ? "text-emerald-400"
      : sensorData.failureRisk === "MEDIUM"
        ? "text-amber-400"
        : "text-red-400";

  const modeButton = (mode, activeClass, idleClass) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      simulationMode === mode ? activeClass : idleClass
    }`;

  return (
    <>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Prototype CB-01 · Live monitoring and guarded drive
          </p>
          <h1 className="text-3xl font-bold text-white">Conveyor Health Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Live ESP32 readings, encoder feedback, and local conveyor controls.
          </p>
        </div>

        <div className="w-fit rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          Circuit rev. 1.0 · forward drive
        </div>
      </header>

     

      <HardwareDiagnosticsCard />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0D1728] p-5">
          <p className="text-sm text-slate-400">Demo operating mode</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSimulationMode("NORMAL")}
              className={modeButton(
                "NORMAL",
                "border-emerald-400 bg-emerald-400 text-slate-950",
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              )}
            >
              NORMAL
            </button>
            <button
              type="button"
              onClick={() => setSimulationMode("WARNING")}
              className={modeButton(
                "WARNING",
                "border-amber-300 bg-amber-300 text-slate-950",
                "border-amber-500/30 bg-amber-500/10 text-amber-300",
              )}
            >
              WARNING
            </button>
            <button
              type="button"
              onClick={() => setSimulationMode("CRITICAL")}
              className={modeButton(
                "CRITICAL",
                "border-red-500 bg-red-500 text-white",
                "border-red-500/30 bg-red-500/10 text-red-300",
              )}
            >
              CRITICAL
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            These controls affect simulated dashboard data only, never the physical conveyor.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1728] p-5">
          <p className="text-sm text-slate-400">Communication status</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                backendConnected ? "bg-emerald-400" : "bg-red-400"
              }`}
              aria-hidden="true"
            />
            <div>
              <p className={`font-semibold ${backendConnected ? "text-emerald-400" : "text-red-400"}`}>
                {backendConnected ? "Backend connected" : "Backend disconnected"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Node.js API · localhost:5000</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Simulated belt health"
          value={sensorData.healthScore}
          unit="/100"
          source={sensorData.status}
          valueClass={healthClass}
          sourceClass={healthClass}
        />
        <SummaryCard
          label="Simulated vibration"
          value={sensorData.vibration}
          unit="mm/s"
          source="Demo stream"
          sourceClass="text-violet-400"
        />
        <SummaryCard
          label="Simulated temperature"
          value={sensorData.temperature}
          unit="°C"
          source="Demo stream"
          sourceClass="text-orange-400"
        />
        <SummaryCard
          label="Simulated motor current"
          value={sensorData.motorCurrent}
          unit="A"
          source="Demo only · physical motor disconnected"
          sourceClass="text-amber-400"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Simulated belt speed"
          value={sensorData.beltSpeed}
          unit="m/s"
          source="Demo stream"
          sourceClass="text-blue-400"
        />
        <SummaryCard
          label="Simulated alignment"
          value={sensorData.alignment}
          unit="mm"
          source="Demo stream"
          sourceClass="text-cyan-400"
        />
        <SummaryCard
          label="Experimental joint"
          value="J01"
          source="Camera inspection zone"
          sourceClass="text-emerald-400"
        />
        <SummaryCard
          label="Simulated failure risk"
          value={sensorData.failureRisk}
          source="Calculated from demo data"
          valueClass={riskClass}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BeltTrackerCard />
        <VisionCard />
      </div>

      <div className="mb-5">
        <HealthCard />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <JointTable />
        <CameraCard />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Charts />
        <Alerts />
      </div>
    </>
  );
}
