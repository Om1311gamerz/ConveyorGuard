import { Camera } from "lucide-react";
import { Panel, TextLink } from "./UI";
export default function CameraCard() {
  return <Panel title="Inspection camera" subtitle="Browser preview and Python inference are separate camera consumers"><div className="camera-placeholder"><Camera size={32} /><p>Open the inspection workspace</p><span>Choose a browser camera or view the Python worker status.</span><TextLink to="/live-feed">Open Live Feed</TextLink></div></Panel>;
}
