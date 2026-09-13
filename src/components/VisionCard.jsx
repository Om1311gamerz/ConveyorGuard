import { useSensorData } from "../context/SensorContext";
import { Panel, EmptyState, Badge } from "./UI";
import { format, sourceLabel } from "../lib/api";

export default function VisionCard() {
  const { snapshot, backendConnected } = useSensorData();
  const vision = snapshot?.vision;
  const live = backendConnected && vision?.connected;
  return <Panel title="Computer vision" subtitle="YOLO11n · custom belt-defect model" action={<Badge status={live && vision?.source === "CAMERA" ? "CONNECTED" : "UNKNOWN"}>{live ? sourceLabel(vision.source) : "WORKER OFFLINE"}</Badge>}>
    {!live ? <EmptyState title="No active vision worker" message={vision?.timestamp ? "Last detector result is historical. Camera coverage is currently unknown." : "Start the Python inference worker with an explicit camera or file source."} /> : vision.defectDetected ? <>
      <div className="vision-result"><div><span>Detected class</span><strong>{vision.type}</strong></div><div><span>Model confidence</span><strong>{format(vision.confidence, 1)}%</strong></div><div><span>Visual severity · heuristic</span><strong>{format(vision.severity, 1)}/100</strong></div><div><span>Encoder-associated position</span><strong>{vision.beltPosition == null ? "Untracked" : format(vision.beltPosition, 3) + " m"}</strong></div></div>
      <p className="technical-note">{vision.source === "FILE" ? "File inference is not a live camera stream and is excluded from sensor fusion. " : ""}Confidence is a detector score. A calibrated encoder and a fresh ESP32 position are required for defect matching.</p>
    </> : <EmptyState title={vision.source === "CAMERA" ? "No defect reported in the latest processed frame" : "No defect reported in the latest file frame"} message="This observation does not certify belt integrity." />}
  </Panel>;
}
