import { Link } from "react-router-dom";
import { format } from "../lib/api";

export function Badge({ children, status = "UNKNOWN" }) {
  const color = ["NORMAL", "Healthy", "CONNECTED", "RESOLVED"].includes(status) ? "badge-green" : ["CRITICAL", "Critical", "OFFLINE"].includes(status) ? "badge-red" : ["SIMULATION", "WARNING", "Warning", "PARTIAL", "STOPPED"].includes(status) ? "badge-amber" : "badge-slate";
  return <span className={`badge ${color}`}>{children ?? status}</span>;
}

export function PageHeader({ eyebrow = "CB-01 · engineering prototype", title, description, action }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</header>;
}

export function Panel({ title, subtitle, action, children, className = "" }) {
  return <section className={`panel ${className}`}><div className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div><div className="panel-body">{children}</div></section>;
}

export function Metric({ label, value, unit, caption, icon: Icon }) {
  return <article className="metric"><div className="metric-label">{label}{Icon && <Icon size={17} aria-hidden="true" />}</div><p className="metric-value">{format(value)}<span>{unit}</span></p><p className="metric-caption">{caption}</p></article>;
}

export function EmptyState({ title = "Waiting for data", message, retry }) {
  return <div className="empty-state"><p>{title}</p><span>{message}</span>{retry && <button className="button button-secondary" onClick={retry}>Retry connection</button>}</div>;
}

export function ErrorState({ error, retry }) {
  return <div className="notice notice-error" role="alert"><p>{error}</p>{retry && <button className="text-link" onClick={retry}>Retry</button>}</div>;
}

export function FaultList({ faults = [] }) {
  return faults.length ? <div className="fault-list">{faults.map(fault => <article key={fault.faultType} className="fault"><div className="fault-heading"><h3>{fault.faultType.replaceAll("_", " ")}</h3><Badge status={fault.severity} /></div><p>{fault.explanation}</p><div className="signal-tags">{fault.contributingSignals.map(signal => <span key={signal}>{signal.replaceAll("_", " ")}</span>)}</div><p className="recommendation">{fault.recommendation}</p></article>)}</div> : <EmptyState title="No rule matches in the available signals" message="Missing sensors and an offline vision worker remain unknown." />;
}

export function TextLink({ to, children }) { return <Link className="text-link" to={to}>{children} →</Link>; }
