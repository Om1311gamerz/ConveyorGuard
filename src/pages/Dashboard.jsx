import { Activity, Thermometer, Zap, Gauge, MoveHorizontal, ShieldCheck } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import BeltTrackerCard from "../components/BeltTrackerCard";
import CameraCard from "../components/CameraCard";
import HardwareDiagnosticsCard from "../components/HardwareDiagnosticsCard";
import HealthCard from "../components/HealthCard";
import VisionCard from "../components/VisionCard";
import Alerts from "../components/Alert";
import { useSensorData } from "../context/SensorContext";
import { PageHeader, Panel, Metric, Badge, FaultList, ErrorState } from "../components/UI";
import { format, sourceLabel } from "../lib/api";
const Charts = lazy(() => import("../components/Chart"));

export default function Dashboard() {
  const { sensorData, operationMode, simulationMode, setSimulationMode, useHardware, backendConnected, fresh, health, loading, error, refresh, source } = useSensorData();
  const [actionError, setActionError] = useState(""), [busy, setBusy] = useState(false);
  async function change(action) { setBusy(true); setActionError(""); try { await action(); } catch (err) { setActionError(err.message); } finally { setBusy(false); } }
  return <>
    <PageHeader eyebrow="CONVEYOR CB-01 / CONDITION MONITORING" title="Know the condition. Act with evidence." description="Sensor measurements, visual inspection and explainable maintenance alerts in one workspace." action={<Badge status="UNKNOWN">SIH PROTOTYPE</Badge>} />
    {error && <ErrorState error={"Backend connection lost. Live measurements are unavailable. " + error} retry={refresh} />}
    {actionError && <ErrorState error={actionError} />}
    <section className="overview-grid">
      <article className={"health-overview condition-" + (health?.condition || "UNKNOWN").toLowerCase()}><div className="health-label"><ShieldCheck size={19} /><span>CONDITION INDEX</span><Badge status={health?.condition || "UNKNOWN"}>{fresh ? health.condition : loading ? "CONNECTING" : "NO FRESH DATA"}</Badge></div><div className="health-number">{format(sensorData.healthScore, 1)}<span>/100</span></div><p>{fresh ? sourceLabel(source) + " · " + health.dataQuality.availableSignals + "/5 sensor signals available" : "Waiting for a fresh, identified sensor packet"}</p><div className="health-track"><div style={{ width: (sensorData.healthScore || 0) + "%" }} /></div><small>Prototype threshold index · failure probability and remaining life are not estimated.</small></article>
      <Panel title="Choose the monitoring source" subtitle="Simulation never changes a physical motor">
        <div className="source-selector"><button disabled={busy || !backendConnected} className={"button " + (operationMode === "HARDWARE" ? "button-primary" : "button-secondary")} onClick={() => change(useHardware)}>ESP32 hardware</button><button disabled={busy || !backendConnected} className={"button " + (operationMode === "SIMULATION" ? "button-primary" : "button-secondary")} onClick={() => change(() => setSimulationMode("NORMAL"))}>Enable simulation</button></div>
        <div className="demo-buttons" aria-label="Simulation scenario">{["NORMAL", "WARNING", "CRITICAL"].map(mode => <button disabled={busy || !backendConnected || operationMode !== "SIMULATION"} aria-pressed={operationMode === "SIMULATION" && simulationMode === mode} key={mode} className={"demo-button " + mode.toLowerCase() + (operationMode === "SIMULATION" && simulationMode === mode ? " selected" : "")} onClick={() => change(() => setSimulationMode(mode))}>{mode}</button>)}</div>
        <p className="technical-note">{operationMode === "SIMULATION" ? "One backend simulator serves every open dashboard. Its readings, condition events and encoder state have SIMULATOR provenance." : "Hardware mode starts with unknown values. Geometry, alignment and electrical measurement validity must be verified before those features are used."}</p>
      </Panel>
    </section>
    <div className="metric-grid">
      <Metric icon={Activity} label="Dynamic acceleration RMS" value={sensorData.vibration} unit="m/s²" caption={sourceLabel(source)} />
      <Metric icon={Thermometer} label="Object temperature" value={sensorData.temperature} unit="°C" caption={sourceLabel(source)} />
      <Metric icon={Zap} label="Measured motor current" value={sensorData.motorCurrent} unit="A" caption={source === "SIMULATOR" ? "SIMULATION" : "Requires verified current sensing"} />
      <Metric icon={Gauge} label="Belt speed" value={sensorData.beltSpeed} unit="m/s" caption={source === "SIMULATOR" ? "SIMULATION" : "Requires calibrated roller geometry"} />
      <Metric icon={MoveHorizontal} label="Alignment deviation" value={sensorData.alignment} unit="mm" caption={source === "SIMULATOR" ? "SIMULATION" : "Requires measured L/R baseline"} />
    </div>
    <Panel title="Fault assessment & recommended action" subtitle="Explainable sensor combinations · prototype rules" action={<Badge status="UNKNOWN">HEURISTIC</Badge>}><FaultList faults={health?.faults} /></Panel>
    <div className="two-columns"><BeltTrackerCard /><VisionCard /></div>
    <HealthCard />
    <div className="two-columns"><CameraCard /><Alerts /></div>
    <Suspense fallback={<p className="empty-state">Loading trend charts…</p>}><div className="two-columns"><Charts /></div></Suspense>
    <details className="diagnostics-details"><summary>Physical ESP32 diagnostics <span>Raw readings and initialization, separate from simulation</span></summary><HardwareDiagnosticsCard /></details>
  </>;
}
