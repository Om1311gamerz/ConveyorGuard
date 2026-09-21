import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import VisionCard from "../components/VisionCard";
import { PageHeader, Panel, Badge, ErrorState } from "../components/UI";
import { API_BASE, api } from "../lib/api";

export default function LiveFeed() {
  const frameUrlRef = useRef(null);
  const [frameUrl, setFrameUrl] = useState(null);
  const [worker, setWorker] = useState({ running: false, source: null, error: null });
  const [cameraIndex, setCameraIndex] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let loading = false;
    const clearFrame = () => {
      if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = null;
      if (active) setFrameUrl(null);
    };
    const refreshFrame = async () => {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch(`${API_BASE}/api/vision/frame`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
        if (!active) return;
        if (response.status === 204) { clearFrame(); return; }
        if (!response.ok) throw new Error(`Frame request failed (${response.status})`);
        const nextUrl = URL.createObjectURL(await response.blob());
        if (!active) { URL.revokeObjectURL(nextUrl); return; }
        const previousUrl = frameUrlRef.current;
        frameUrlRef.current = nextUrl;
        setFrameUrl(nextUrl);
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      } catch {
        if (active) clearFrame();
      } finally { loading = false; }
    };
    const refreshWorker = async () => {
      try {
        const status = await api("/api/vision/worker");
        if (active) setWorker(status);
      } catch { if (active) setWorker({ running: false, source: null, error: null }); }
    };
    refreshFrame();
    refreshWorker();
    const frameTimer = setInterval(refreshFrame, 250);
    const statusTimer = setInterval(refreshWorker, 1000);
    return () => {
      active = false;
      clearInterval(frameTimer);
      clearInterval(statusTimer);
      clearFrame();
    };
  }, []);

  async function startCamera() {
    setBusy(true); setError("");
    try {
      setWorker(await api("/api/vision/worker/start", { method: "POST", body: JSON.stringify({ source: Number(cameraIndex) }) }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function stopCamera() {
    setBusy(true); setError("");
    try { setWorker(await api("/api/vision/worker/stop", { method: "POST", body: "{}" })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Visual inspection workspace" description="Live frames and YOLO bounding boxes come from the same camera worker." />
    {error && <ErrorState error={error} />}
    <div className="two-columns camera-layout">
      <Panel title="YOLO Live Feed" subtitle="Annotated frames from the Python camera worker" action={<Badge status={frameUrl ? "CONNECTED" : "UNKNOWN"}>{frameUrl ? "LIVE" : "OFFLINE"}</Badge>}>
        <div className="video-area">
          {frameUrl && <img className="annotated-feed" src={frameUrl} alt="Live camera frame with YOLO detections" />}
          {!frameUrl && <div className="video-empty"><Camera size={40} /><p>{worker.running ? "Waiting for the first YOLO frame…" : "YOLO camera is stopped"}</p><span>Frames are shown only when the detector is receiving a real camera image.</span></div>}
        </div>
        <div className="camera-controls">
          <label>Camera index<select value={cameraIndex} onChange={event => setCameraIndex(event.target.value)} disabled={worker.running || busy}>{[0, 1, 2, 3].map(index => <option key={index} value={index}>{index}</option>)}</select></label>
          <button className="button button-primary" onClick={startCamera} disabled={worker.running || busy}>{busy ? "Starting…" : "Start YOLO camera"}</button>
          <button className="button button-secondary" onClick={stopCamera} disabled={!worker.running || busy}>Stop YOLO camera</button>
        </div>
        {worker.error && !worker.running && <p className="technical-note" role="alert">Camera worker: {worker.error}</p>}
      </Panel>
      <div><VisionCard /><div className="notice">The Python worker owns the selected camera and sends its real annotated frames here. Camera index 0 is usually the laptop webcam; select 1 or 2 for a USB camera if needed. A separate browser camera preview is no longer opened.</div></div>
    </div>
  </>;
}
