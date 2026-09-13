import { useState } from "react";
import defaults from "../../config/defaults.json";
import { useSensorData } from "../context/SensorContext";
import { PageHeader, Panel, EmptyState, ErrorState } from "../components/UI";
export default function Settings() {
  const context = useSensorData();
  if (!context.snapshot) return <EmptyState title="Configuration unavailable" message="Connect the backend to load persisted settings." retry={context.refresh} />;
  return <Editor context={context} />;
}
function Editor({ context }) {
  const [thresholds, setThresholds] = useState(context.thresholds), [hardware, setHardware] = useState(context.hardwareConfig);
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try { await context.saveThresholds(thresholds, hardware); setMessage("Configuration saved in SQLite. All monitoring rules use this configuration."); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const metrics = [["vibration", "Dynamic acceleration RMS", "m/s²"], ["temperature", "Object temperature", "°C"], ["motorCurrent", "Measured motor current", "A"], ["alignment", "Alignment deviation", "mm"]];
  return <><PageHeader title="Monitoring configuration" description="One backend configuration supplies thresholds to ingestion, fault rules, health scoring, charts and the simulator." />
    <div className="notice">Thresholds are prototype engineering values, not industrial limits. Verify sensor features and equipment ratings before interpreting real measurements.</div>
    {error && <ErrorState error={error} />}{message && <div className="notice notice-success" role="status">{message}</div>}
    <div className="two-columns">{metrics.map(([metric, title, unit]) => <Panel key={metric} title={title} subtitle={unit}><div className="form-grid">{["Warning", "Critical"].map(level => <label key={level}>{level} threshold<input type="number" step="0.01" min="0.001" value={thresholds[metric + level]} onChange={e => setThresholds(previous => ({ ...previous, [metric + level]: Number(e.target.value) }))} /></label>)}</div></Panel>)}</div>
    <Panel title="Sensor validity & geometry" subtitle="These settings describe verified measurements; they do not perform hardware calibration">
      <div className="form-grid">{[
        ["beltLengthMeters", "Belt loop length (m)", 0.01],
        ["rollerDiameterMeters", "Encoder roller diameter (m)", 0.001],
        ["encoderPPR", "Channel-A pulses per revolution", 1],
        ["positionToleranceMeters", "Circular defect tolerance (m)", 0.01],
        ["alignmentOffsetMm", "Measured left − right baseline (mm)", 0.1],
      ].map(([field, label, step]) => <label key={field}>{label}<input type="number" step={step} value={hardware[field]} onChange={e => setHardware(previous => ({ ...previous, [field]: Number(e.target.value) }))} /></label>)}<label>Low-speed threshold for current + speed rule (m/s)<input type="number" min="0.001" step="0.01" value={thresholds.beltSpeedLow} onChange={e => setThresholds(previous => ({ ...previous, beltSpeedLow: Number(e.target.value) }))} /></label></div>
      <div className="validity-options">{[
        ["geometryCalibrated", "Belt geometry and encoder resolution independently verified"],
        ["alignmentCalibrated", "Left/right sensor mounting and baseline independently verified"],
        ["currentMeasurementValid", "INA219 is in a verified measurement path within its rated range"],
      ].map(([field, label]) => <label key={field}><input type="checkbox" checked={hardware[field]} onChange={e => setHardware(previous => ({ ...previous, [field]: e.target.checked }))} /><span>{label}</span></label>)}</div>
      <p className="technical-note">All validity flags default to false. Geometry changes reset the in-memory encoder reference; historical readings and observations remain stored. Physical joint indexing is not implemented.</p>
    </Panel>
    <div className="settings-actions"><button className="button button-primary" disabled={busy || !context.backendConnected} onClick={save}>{busy ? "Saving…" : "Save configuration"}</button><button className="button button-secondary" disabled={busy} onClick={() => { setThresholds(structuredClone(defaults.thresholds)); setHardware(structuredClone(defaults.hardware)); setMessage("Defaults loaded into the form. Save to persist them."); }}>Load prototype defaults</button></div>
  </>;
}
