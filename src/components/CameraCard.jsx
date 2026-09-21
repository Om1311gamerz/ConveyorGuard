import { Camera } from "lucide-react";
import { Panel, TextLink } from "./UI";
export default function CameraCard() {
  return <Panel title="Inspection camera" subtitle="Live annotated feed from the YOLO worker"><div className="camera-placeholder"><Camera size={32} /><p>Open the inspection workspace</p><span>Start the YOLO camera and view its real bounding boxes in Live Feed.</span><TextLink to="/live-feed">Open Live Feed</TextLink></div></Panel>;
}
