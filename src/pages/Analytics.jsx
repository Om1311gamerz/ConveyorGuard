import { SensorChart } from "../components/Chart";
import { PageHeader, ErrorState } from "../components/UI";
import { useSensorData } from "../context/SensorContext";
export default function Analytics() {
  const { thresholds, historyError, source } = useSensorData();
  return <><PageHeader title="Condition trends" description={"Persisted " + (source === "SIMULATOR" ? "SIMULATION" : "ESP32") + " history. Threshold guides use the current configuration; missing measurements remain gaps."} />{historyError && <ErrorState error={historyError} />}<div className="two-columns"><SensorChart title="Dynamic acceleration RMS" unit="m/s²" field="vibration" warning={thresholds.vibrationWarning} /><SensorChart title="Object temperature" unit="°C" field="temperature" warning={thresholds.temperatureWarning} color="#e4b15c" /><SensorChart title="Measured motor current" unit="A" field="motorCurrent" warning={thresholds.motorCurrentWarning} color="#9c8eef" /><SensorChart title="Alignment deviation" unit="mm" field="alignment" warning={thresholds.alignmentWarning} color="#64a9e8" /></div></>;
}
