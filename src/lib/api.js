export const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

export async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(4000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `API request failed (${response.status})`);
  return payload;
}

export function format(value, digits = 2) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function sourceLabel(source) {
  return source === "SIMULATOR" ? "SIMULATION" : source === "ESP32" ? "ESP32 · measured / derived" : source === "FILE" ? "FILE INFERENCE" : source || "UNKNOWN";
}
