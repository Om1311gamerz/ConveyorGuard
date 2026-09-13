import { useSensorData } from "../context/SensorContext";
import { Panel, EmptyState, Badge } from "./UI";
import { format } from "../lib/api";

export default function HealthCard() {
  const { health, thresholds, source } = useSensorData();
  return <Panel title="How the condition index is calculated" subtitle="Transparent prototype rules · no remaining-life prediction" action={<Badge status="UNKNOWN">HEURISTIC</Badge>}>
    {!health ? <EmptyState title="Condition assessment unavailable" message="A fresh sensor sample is required. Unknown signals are never assigned zero risk." /> : <>
      <div className="risk-grid">{[
        ["vibration", "Dynamic acceleration", thresholds.vibrationWarning, "m/s²"],
        ["temperature", "Object temperature", thresholds.temperatureWarning, "°C"],
        ["motor_current", "Measured motor current", thresholds.motorCurrentWarning, "A"],
        ["alignment", "Alignment deviation", thresholds.alignmentWarning, "mm"],
      ].map(([key, label, warning, unit]) => <div className="risk-item" key={key}><div><span>{label}</span><strong>{format(health.signals[key]?.value)} {unit}</strong></div><div className="risk-track"><div style={{ width: (health.risks[key] ?? 0) + "%" }} /></div><small>{health.risks[key] === null ? "Unknown · omitted from index" : format(health.risks[key], 1) + "/100 threshold risk"} · warning ≥ {warning} {unit}</small></div>)}</div>
      <p className="technical-note">Index = 100 − 0.6 × highest risk − 0.4 × mean observed risk. A warning starts at risk 45; a critical threshold reaches 100. {health.dataQuality.availableSignals}/5 sensor signals available. {source === "SIMULATOR" ? "Vision is excluded from simulation." : health.dataQuality.visionAvailable ? "Fresh camera severity participates in the index." : "Vision is unavailable and omitted."}</p>
    </>}
  </Panel>;
}
