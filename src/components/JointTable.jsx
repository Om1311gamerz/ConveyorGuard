import { useSensorData } from "../context/SensorContext";
import { Panel, EmptyState } from "./UI";
import { format } from "../lib/api";
export default function JointTable() {
  const { snapshot } = useSensorData();
  const defects = snapshot?.defects || [];
  return <Panel title="Encoder-associated defects" subtitle="Persisted observations · counted once per belt cycle">
    {!defects.length ? <EmptyState title="No tracked defects recorded" message="A model result can be stored without a belt position. Repeated defect matching requires calibrated ESP32 geometry." /> : <div className="table-scroll"><table><thead><tr><th>ID</th><th>Class</th><th>Position</th><th>Confidence</th><th>Cycles observed</th></tr></thead><tbody>{defects.map(defect => <tr key={defect.id}><td>{defect.id}</td><td>{defect.type}</td><td>{format(defect.position, 3)} m</td><td>{format(defect.latestConfidence, 1)}%</td><td>{defect.timesSeen}</td></tr>)}</tbody></table></div>}
    <p className="technical-note">These IDs represent position-associated visual defects. Physical joint identity and joint-specific sensor measurements require calibration and are not implemented.</p>
  </Panel>;
}
