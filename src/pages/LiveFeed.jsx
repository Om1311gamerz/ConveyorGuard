import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import VisionCard from "../components/VisionCard";
import { PageHeader, Panel, Badge, ErrorState } from "../components/UI";
export default function LiveFeed() {
  const videoRef = useRef(null), streamRef = useRef(null), generation = useRef(0);
  const [connected, setConnected] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [devices, setDevices] = useState([]), [selectedDevice, setSelectedDevice] = useState("");
  const stopCamera = useCallback(() => {
    generation.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false); setBusy(false);
  }, []);
  useEffect(() => () => { generation.current += 1; streamRef.current?.getTracks().forEach(track => track.stop()); }, []);
  async function startCamera(deviceId = selectedDevice) {
    stopCamera();
    const request = generation.current; setBusy(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser camera access requires localhost or a secure connection.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false });
      if (generation.current !== request) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", () => { if (generation.current === request) { stopCamera(); setError("Camera disconnected. Reconnect it and start the preview again."); } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setConnected(true); setSelectedDevice(track.getSettings().deviceId || "");
      const available = await navigator.mediaDevices.enumerateDevices();
      if (generation.current === request) setDevices(available.filter(device => device.kind === "videoinput"));
    } catch (err) {
      if (generation.current !== request) return;
      stopCamera();
      setError(err.name === "NotAllowedError" ? "Camera permission was denied. Grant permission to start the preview." : err.name === "NotFoundError" ? "No camera was found." : err.name === "NotReadableError" ? "Camera unavailable. Close other camera consumers, including the Python worker, and retry." : err.message);
    } finally { if (generation.current === request) setBusy(false); }
  }
  return <><PageHeader title="Visual inspection workspace" description="Browser preview shows raw camera frames. Python inference reports its own real detector results and annotations." />
    {error && <ErrorState error={error} />}
    <div className="two-columns camera-layout"><Panel title="Browser camera preview" subtitle="Raw preview · no browser-side YOLO inference" action={<Badge status={connected ? "CONNECTED" : "UNKNOWN"}>{connected ? "PREVIEW LIVE" : "PREVIEW OFFLINE"}</Badge>}><div className="video-area"><video ref={videoRef} autoPlay playsInline muted />{!connected && <div className="video-empty"><Camera size={40} /><p>{busy ? "Opening camera…" : "Camera preview is stopped"}</p><span>No synthetic overlays or confidence values.</span></div>}</div><div className="camera-controls">{devices.length > 1 && <label>Camera<select value={selectedDevice} onChange={e => { setSelectedDevice(e.target.value); startCamera(e.target.value); }}>{devices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Camera " + (i + 1)}</option>)}</select></label>}<button disabled={busy} className="button button-primary" onClick={() => startCamera()}>{connected ? "Restart preview" : "Start camera preview"}</button><button className="button button-secondary" onClick={stopCamera}>Stop preview</button></div></Panel><div><VisionCard /><div className="notice">The browser and Python worker may compete for the same USB camera. Stop this preview before starting camera inference. The Python worker displays bounding boxes on its own annotated frames; browser preview frames are not matched to detector results.</div></div></div>
  </>;
}
