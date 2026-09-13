import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { useSensorData } from "../context/SensorContext";
import { PageHeader, Panel, Metric, EmptyState, ErrorState, Badge } from "../components/UI";
import { format } from "../lib/api";
export default function Reports() {
  const { source } = useSensorData();
  const [filter, setFilter] = useState("CURRENT");
  const selected = filter === "CURRENT" ? source : filter;
  const resource = useApi("/api/reports/summary?source=" + selected + "&conveyorId=CB-01", 5000);
  const report = resource.data, summary = report?.summary;
  function download() { const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "conveyorguard-report-" + selected.toLowerCase() + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <><PageHeader title="Engineering reports" description="SQLite aggregates scoped to a single source. Unknown legacy records have unverified units and are reported separately." action={<label className="filter-label">Reading source<select value={filter} onChange={e => setFilter(e.target.value)}><option value="CURRENT">Current sensor source</option><option value="SIMULATOR">SIMULATION</option><option value="ESP32">ESP32</option><option value="UNKNOWN">Unknown / legacy</option></select></label>} />
    {resource.error && <ErrorState error={resource.error} retry={resource.refresh} />}
    {resource.loading ? <EmptyState title="Loading database report…" /> : !summary ? <EmptyState title="Report unavailable" /> : <>
      <div className="report-toolbar"><Badge status={selected === "SIMULATOR" ? "SIMULATION" : "UNKNOWN"}>{selected === "SIMULATOR" ? "SIMULATION RECORDS" : selected + " RECORDS"}</Badge><button className="button button-secondary" disabled={Boolean(resource.error)} onClick={download}>Export report JSON</button></div>
      {selected === "UNKNOWN" && <div className="notice">Legacy rows were saved before source and vibration units were standardized. Their historical values are preserved; treat vibration statistics as unverified.</div>}
      <div className="metric-grid report-grid"><Metric label="Stored readings" value={summary.totalReadings} caption="Persistent SQLite records" /><Metric label="Average dynamic acceleration" value={summary.avgVibration} unit={selected === "UNKNOWN" ? "unverified" : "m/s²"} caption={"Peak: " + format(summary.maxVibration)} /><Metric label="Average temperature" value={summary.avgTemperature} unit="°C" caption={"Peak: " + format(summary.maxTemperature)} /><Metric label="Average measured current" value={summary.avgMotorCurrent} unit="A" caption={"Peak: " + format(summary.maxMotorCurrent)} /><Metric label="Average alignment" value={summary.avgAlignment} unit="mm" caption={"Peak: " + format(summary.maxAlignment)} /><Metric label="Average condition index" value={summary.avgHealth} unit="/100" caption={"Lowest: " + format(summary.lowestHealth) + " · heuristic"} /></div>
      <Panel title="Recorded operating modes" subtitle="Simulation labels are stored on each reading">
        {!report.operatingModes.length ? <EmptyState title="No readings stored for this source" /> : report.operatingModes.map(mode => <div className="distribution-row" key={mode.source + mode.simulationMode}><div><span>{mode.simulationMode || mode.source}</span><strong>{mode.count} readings</strong></div><div className="distribution-track"><div style={{ width: mode.count / (summary.totalReadings || 1) * 100 + "%" }} /></div></div>)}
        <p className="technical-note">{summary.firstReading ? "Time range: " + new Date(summary.firstReading).toLocaleString() + " — " + new Date(summary.latestReading).toLocaleString() : "No historical time range yet."} Missing measurements are excluded from averages, rather than replaced with zero.</p>
      </Panel>
    </>}
  </>;
}
