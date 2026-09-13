import { useSensorData } from "../context/SensorContext";
import { Panel, EmptyState, Badge, TextLink } from "./UI";
export default function Alerts() {
  const { alerts, fresh } = useSensorData();
  return <Panel title="Active maintenance events" subtitle="Stored by the backend" action={<TextLink to="/alerts">Event history</TextLink>}>
    {!alerts.length ? <EmptyState title={fresh ? "No active events" : "Live status unknown"} message={fresh ? "Available signals do not match an alert rule." : "Waiting for fresh sensor data."} /> : <div className="event-preview">{alerts.slice(0, 4).map(event => <div key={event.id}><div><strong>{event.fault_type.replaceAll("_", " ")}</strong><Badge status={event.severity} /></div><p>{event.recommendation}</p><small>{event.source} · last observed {new Date(event.updated_at).toLocaleTimeString()}</small></div>)}</div>}
  </Panel>;
}
