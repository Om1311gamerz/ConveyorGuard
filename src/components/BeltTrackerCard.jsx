import { useSensorData } from "../context/SensorContext";
import { Panel, Badge } from "./UI";
import { format, sourceLabel } from "../lib/api";

export default function BeltTrackerCard() {
  const { snapshot, backendConnected } = useSensorData();
  const belt = snapshot?.belt, live = backendConnected && belt?.connected;
  return <Panel title="Belt position & motion" subtitle={sourceLabel(belt?.source)} action={<Badge status={live ? "CONNECTED" : "UNKNOWN"}>{live ? "RECEIVING" : "NO FRESH ENCODER DATA"}</Badge>}>
    <div className="vision-result">{[
      ["Roller speed", live ? belt.rollerRPM : null, "RPM"],
      ["Loop position", live && belt.positionValid ? belt.beltPositionMeters : null, "m"],
      ["Completed signed cycles", live && belt.positionValid ? belt.completedBeltCycles : null, ""],
      ["Belt speed", live ? belt.beltSpeedMetersPerSecond : null, "m/s"],
    ].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{format(value, 3)} {unit}</strong></div>)}</div>
    <p className="technical-note">{belt?.source === "SIMULATOR" ? "Simulated encoder pulses · isolated from physical position tracking." : "Position and speed in metres require verified belt geometry. Firmware uses 600 channel-A pulses/rev with ×4 quadrature decoding. A physical index marker is not implemented."}</p>
  </Panel>;
}
