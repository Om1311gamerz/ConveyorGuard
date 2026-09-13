// oxlint-disable react/only-export-components -- provider and hook share a context.
import { createContext, useContext } from "react";
import defaults from "../../config/defaults.json";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const SensorContext = createContext();
const EMPTY = { vibration: null, temperature: null, motorCurrent: null, beltSpeed: null, alignment: null, healthScore: null, status: "UNKNOWN", source: null };

export function SensorProvider({ children }) {
  const status = useApi("/api/beltguard/status", 750);
  const snapshot = status.data;
  const source = snapshot?.source || "ESP32";
  const historical = useApi("/api/sensor-data?source=" + source + "&conveyorId=CB-01&limit=100", 5000);
  const backendConnected = Boolean(snapshot) && !status.error;
  const fresh = backendConnected && snapshot?.sensor && !snapshot?.health?.stale;
  const reading = snapshot?.sensor;
  const health = snapshot?.health;
  const sensorData = fresh ? {
    ...reading, vibration: reading.vibration, temperature: reading.temperature,
    motorCurrent: reading.motor_current, beltSpeed: reading.belt_speed, alignment: reading.alignment,
    healthScore: health?.healthScore, status: health?.status || "UNKNOWN", source,
  } : { ...EMPTY, source };
  async function setSimulationMode(mode) {
    await api("/api/demo", { method: "POST", body: JSON.stringify({ enabled: true, mode }) });
    status.refresh(); historical.refresh();
  }
  async function useHardware() {
    await api("/api/demo", { method: "POST", body: JSON.stringify({ enabled: false }) });
    status.refresh(); historical.refresh();
  }
  async function saveThresholds(thresholds, hardware) {
    await api("/api/config", { method: "PUT", body: JSON.stringify({ thresholds, hardware }) });
    status.refresh();
  }
  const history = (historical.data || []).slice().reverse().map(row => ({
    ...row, timestamp: new Date(row.timestamp), motorCurrent: row.motor_current, beltSpeed: row.belt_speed,
  }));
  return <SensorContext.Provider value={{
    snapshot, sensorData, history, backendConnected, fresh,
    loading: status.loading, error: status.error, historyError: historical.error, refresh: status.refresh,
    health: fresh ? health : null, alerts: snapshot?.alerts || [], source,
    operationMode: snapshot?.operationMode || "HARDWARE", simulationMode: snapshot?.demoMode || "NORMAL",
    setSimulationMode, useHardware, thresholds: snapshot?.config?.thresholds || defaults.thresholds,
    hardwareConfig: snapshot?.config?.hardware || defaults.hardware, saveThresholds, DEFAULT_THRESHOLDS: defaults.thresholds,
  }}>{children}</SensorContext.Provider>;
}
export function useSensorData() { return useContext(SensorContext); }
