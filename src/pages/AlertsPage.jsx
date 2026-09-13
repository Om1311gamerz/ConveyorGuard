import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { useSensorData } from "../context/SensorContext";
import { PageHeader, Panel, EmptyState, ErrorState, Badge } from "../components/UI";
export default function AlertsPage() {
  const { source } = useSensorData();
  const [filter, setFilter] = useState("CURRENT"), [actionError, setActionError] = useState(""), [busy, setBusy] = useState(null);
  const selected = filter === "CURRENT" ? source : filter;
  const events = useApi("/api/alerts?limit=100" + (selected === "ALL" ? "" : "&source=" + selected), 2500);
  async function acknowledge(id) { setBusy(id); setActionError(""); try { await api("/api/alerts/" + id + "/acknowledge", { method: "POST", body: "{}" }); events.refresh(); } catch (error) { setActionError(error.message); } finally { setBusy(null); } }
  return <><PageHeader title="Maintenance event history" description="Persistent alert episodes survive page navigation and API restarts. Recovery closes an episode; acknowledgment records review." action={<label className="filter-label">Event source<select value={filter} onChange={e => setFilter(e.target.value)}><option value="CURRENT">Current sensor source</option><option value="ESP32">ESP32</option><option value="SIMULATOR">SIMULATION</option><option value="CAMERA">Camera worker</option><option value="FILE">File inference</option><option value="UNKNOWN">Unknown / legacy</option><option value="ALL">All sources · labeled separately</option></select></label>} />
    {(events.error || actionError) && <ErrorState error={actionError || events.error} retry={events.refresh} />}
    <Panel title="Recorded episodes" subtitle="Latest 100 episodes · repeated samples update the existing event">
      {events.loading ? <EmptyState title="Loading events…" /> : !events.data?.length ? <EmptyState title="No events recorded for this source" message="Sensor or detector observations create events when a rule matches." /> : <div className="fault-list">{events.data.map(event => <article className="fault" key={event.id}><div className="fault-heading"><div><small>EVENT #{event.id} · {event.source === "SIMULATOR" ? "SIMULATION" : event.source}</small><h3>{event.fault_type.replaceAll("_", " ")}</h3></div><div className="event-badges"><Badge status={event.severity} /><Badge status={event.status}>{event.status}</Badge></div></div><p>{event.explanation}</p><p className="recommendation">{event.recommendation}</p><div className="event-footer"><span>Opened {new Date(event.timestamp).toLocaleString()} · {event.occurrences} observations · last {new Date(event.updated_at).toLocaleString()}{event.resolved_at ? " · resolved " + new Date(event.resolved_at).toLocaleString() : ""}</span>{event.acknowledged_at ? <Badge status="UNKNOWN">ACKNOWLEDGED</Badge> : <button disabled={busy === event.id} className="button button-secondary" onClick={() => acknowledge(event.id)}>Acknowledge</button>}</div></article>)}</div>}
    </Panel>
  </>;
}
