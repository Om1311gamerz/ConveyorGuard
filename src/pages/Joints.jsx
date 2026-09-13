import JointTable from "../components/JointTable";
import VisionCard from "../components/VisionCard";
import BeltTrackerCard from "../components/BeltTrackerCard";
import { PageHeader } from "../components/UI";
export default function Joints() {
  return <><PageHeader title="Belt joints & visual defects" description="Review position-associated visual observations. Joint-specific identity and health measurement are prototype extensions." /><JointTable /><div className="two-columns"><BeltTrackerCard /><VisionCard /></div><div className="notice">The current installation does not identify J01 or other physical joints automatically. Defect IDs group a class within the circular position tolerance and are counted once per observed cycle.</div></>;
}
