// oxlint-disable react/only-export-components -- related chart components share one module.
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useSensorData } from "../context/SensorContext";
import { Panel, EmptyState } from "./UI";
import { format, sourceLabel } from "../lib/api";

export function SensorChart({ title, unit, field, warning, color = "#31c7bd" }) {
  const { history, source, historyError } = useSensorData();
  const data = history.map(row => ({ time: row.timestamp.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }), value: row[field] }));
  const hasData = data.some(row => row.value !== null);
  return <Panel title={title} subtitle={sourceLabel(source) + " · latest 100 persisted samples"} action={<span className="chart-value">{format(data.at(-1)?.value)} {unit}</span>}>
    {historyError && <p className="text-amber-300 text-sm mb-3">Historical data connection lost. Showing the last loaded history.</p>}
    {!hasData ? <EmptyState title="No measured trend available" message="Missing values stay as gaps in the chart." /> : <div className="chart-container"><ResponsiveContainer width="100%" height="100%" minWidth={1}><LineChart data={data} margin={{ left: 0, right: 12, top: 14, bottom: 0 }}><CartesianGrid strokeDasharray="3 6" stroke="#213043" vertical={false} /><XAxis dataKey="time" stroke="#8393a7" fontSize={11} minTickGap={50} tickLine={false} axisLine={false} /><YAxis stroke="#8393a7" fontSize={11} width={42} tickLine={false} axisLine={false} domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "#101b2a", border: "1px solid #324357", borderRadius: 10, color: "#d9e2ed" }} formatter={value => [format(value, 3) + " " + unit, title]} />{warning !== undefined && <ReferenceLine y={warning} stroke="#e4b15c" strokeDasharray="4 4" label={{ value: "warning", fill: "#e4b15c", fontSize: 10, position: "insideTopRight" }} />}<Line type="linear" dataKey="value" stroke={color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}
  </Panel>;
}
export default function Charts() {
  const { thresholds } = useSensorData();
  return <><SensorChart title="Dynamic acceleration trend" unit="m/s²" field="vibration" warning={thresholds.vibrationWarning} /><SensorChart title="Temperature trend" unit="°C" field="temperature" warning={thresholds.temperatureWarning} color="#e4b15c" /></>;
}
