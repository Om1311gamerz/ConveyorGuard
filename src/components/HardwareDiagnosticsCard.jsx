import {
  Activity,
  Cable,
  Clock3,
  Cpu,
  Gauge,
  MoveHorizontal,
  Thermometer,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function formatValue(value, digits = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function formatInteger(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Math.trunc(Number(value)).toLocaleString()}${suffix}`;
}

function DeviceStatus({ label, ready }) {
  const known = typeof ready === "boolean";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2.5">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-xs font-semibold ${ready ? "text-emerald-400" : known ? "text-red-400" : "text-slate-500"}`}>
        {ready ? "READY" : known ? "MISSING" : "WAITING"}
      </span>
    </div>
  );
}

function DataRow({ label, value, warning = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-800/80 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right font-mono text-xs ${warning ? "text-amber-300" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

function SensorCard({ icon: Icon, title, primary, accent = "text-cyan-400", children }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-800 bg-[#0A1423] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
        <Icon size={16} className={accent} aria-hidden="true" />
        <span>{title}</span>
      </div>
      {primary && <p className="mb-3 break-words text-xl font-semibold text-white">{primary}</p>}
      <div>{children}</div>
    </article>
  );
}

export default function HardwareDiagnosticsCard() {
  const [hardware, setHardware] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const loadHardware = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/hardware/latest`);
        if (!response.ok) throw new Error("Hardware endpoint unavailable");
        const payload = await response.json();
        if (!active) return;
        setHardware(payload);
        setApiConnected(true);
      } catch {
        if (active) setApiConnected(false);
      }
    };

    loadHardware();
    const timer = window.setInterval(loadHardware, 100);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const measurement = hardware?.measurement ?? null;
  const startup = hardware?.startup ?? null;
  const hardwareLive = apiConnected && Boolean(hardware?.connected);
  const statusText = !apiConnected
    ? "API OFFLINE"
    : hardwareLive
      ? "ESP32 LIVE"
      : "WAITING FOR ESP32";
  const statusClass = !apiConnected
    ? "border-red-500/30 bg-red-500/10 text-red-300"
    : hardwareLive
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  const deviceState = (key) => {
    if (typeof startup?.[key] === "boolean") return startup[key];
    if (typeof measurement?.[key] === "boolean") return measurement[key];
    return null;
  };

  const tofDifference = useMemo(() => {
    const left = Number(measurement?.left_tof_mm);
    const right = Number(measurement?.right_tof_mm);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    return Math.abs(left - right);
  }, [measurement]);

  const bus1 = startup?.bus1_addresses?.join(", ") || "Waiting for scan";
  const bus2 = startup?.bus2_addresses?.join(", ") || "Waiting for scan";

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0D1728] shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            <Cable size={15} aria-hidden="true" />
            Physical hardware layer
          </div>
          <h2 className="text-xl font-bold text-white">ESP32 Sensor Diagnostic</h2>
          <p className="mt-1 text-sm text-slate-400">
            Every raw USB reading, including encoder and drive-state feedback
          </p>
        </div>
        <div className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${statusClass}`}>
          {statusText}
        </div>
      </div>

      {!measurement && (
        <div className="mx-5 mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/80">
          Start ConveyorGuard and connect the ESP32 with a data-capable USB cable. The serial watcher will connect automatically.
        </div>
      )}

      <div className="grid gap-5 p-5 xl:grid-cols-[0.72fr_2.28fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Initialization</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <DeviceStatus label="ADXL345" ready={deviceState("adxl345_ok")} />
            <DeviceStatus label="MLX90614" ready={deviceState("mlx90614_ok")} />
            <DeviceStatus label="INA219" ready={deviceState("ina219_ok")} />
            <DeviceStatus label="Left VL53L0X" ready={deviceState("left_tof_ok")} />
            <DeviceStatus label="Right VL53L0X" ready={deviceState("right_tof_ok")} />
            <DeviceStatus label="Encoder inputs" ready={startup?.encoder_ready ?? null} />
          </div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 p-3 text-xs leading-5 text-slate-500">
            <p><span className="text-slate-400">Bus 1:</span> {bus1}</p>
            <p><span className="text-slate-400">Bus 2:</span> {bus2}</p>
            <p><span className="text-slate-400">Encoder PPR:</span> {formatInteger(startup?.pulses_per_revolution)}</p>
            <p><span className="text-slate-400">x4 counts/rev:</span> {formatInteger(startup?.counts_per_revolution)}</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest raw sample</p>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock3 size={13} aria-hidden="true" />
              <span>ESP32 t={formatInteger(measurement?.time_ms, " ms")} · host age {formatInteger(hardware?.sampleAgeMs, " ms")}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <SensorCard icon={Activity} title="ADXL345 acceleration" primary={formatValue(measurement?.vibration_magnitude, 3, " m/s²")} accent="text-violet-400">
              <DataRow label="X axis" value={formatValue(measurement?.accel_x, 3, " m/s²")} />
              <DataRow label="Y axis" value={formatValue(measurement?.accel_y, 3, " m/s²")} />
              <DataRow label="Z axis" value={formatValue(measurement?.accel_z, 3, " m/s²")} />
              <DataRow label="Magnitude (gravity included)" value={formatValue(measurement?.vibration_magnitude, 3, " m/s²")} />
            </SensorCard>

            <SensorCard icon={Thermometer} title="MLX90614 temperature" primary={formatValue(measurement?.object_temp, 2, " °C")} accent="text-orange-400">
              <DataRow label="Object" value={formatValue(measurement?.object_temp, 2, " °C")} />
              <DataRow label="Ambient" value={formatValue(measurement?.ambient_temp, 2, " °C")} />
            </SensorCard>

            <SensorCard icon={MoveHorizontal} title="VL53L0X distances" primary={`${formatInteger(measurement?.left_tof_mm)} / ${formatInteger(measurement?.right_tof_mm)} mm`}>
              <DataRow label="Left distance" value={formatInteger(measurement?.left_tof_mm, " mm")} />
              <DataRow label="Left range status" value={formatInteger(measurement?.left_tof_status)} />
              <DataRow label="Right distance" value={formatInteger(measurement?.right_tof_mm, " mm")} />
              <DataRow label="Right range status" value={formatInteger(measurement?.right_tof_status)} />
              <DataRow label="Absolute L/R difference" value={formatValue(tofDifference, 0, " mm")} />
            </SensorCard>

            <SensorCard icon={Gauge} title="Encoder motion" primary={formatValue(measurement?.encoder_rpm, 2, " RPM")} accent="text-emerald-400">
              <DataRow label="Direction" value={measurement?.encoder_direction || "—"} />
              <DataRow label="A pulses/second" value={formatValue(measurement?.encoder_a_pulses_per_sec, 2)} />
              <DataRow label="x4 counts/second" value={formatValue(measurement?.encoder_counts_per_sec, 2)} />
              <DataRow label="Signed RPM" value={formatValue(measurement?.encoder_rpm, 2)} />
            </SensorCard>

            <SensorCard icon={Cpu} title="Encoder position" primary={formatValue(measurement?.encoder_revolutions, 6, " rev")} accent="text-blue-400">
              <DataRow label="Digital A / B" value={`${measurement?.encoder_a ?? "—"} / ${measurement?.encoder_b ?? "—"}`} />
              <DataRow label="Channel-A rising pulses" value={formatInteger(measurement?.encoder_a_pulse_count)} />
              <DataRow label="Signed x4 count" value={formatInteger(measurement?.encoder_count)} />
              <DataRow label="Invalid transitions" value={formatInteger(measurement?.encoder_invalid_transitions)} />
              <DataRow label="Revolutions" value={formatValue(measurement?.encoder_revolutions, 6)} />
            </SensorCard>

            <SensorCard icon={Zap} title="INA219 electrical" primary={formatValue(measurement?.current_ma, 3, " mA")} accent="text-amber-400">
              <DataRow label="Bus voltage" value={formatValue(measurement?.bus_voltage_v, 4, " V")} warning />
              <DataRow label="Shunt voltage" value={formatValue(measurement?.shunt_voltage_mv, 4, " mV")} warning />
              <DataRow label="Load voltage" value={formatValue(measurement?.load_voltage_v, 4, " V")} warning />
              <DataRow label="Current" value={formatValue(measurement?.current_ma, 3, " mA")} warning />
              <DataRow label="Power" value={formatValue(measurement?.power_mw, 3, " mW")} warning />
              <p className="mt-3 text-xs leading-5 text-amber-300/70">VIN+/VIN− are disconnected, so these values are diagnostic only.</p>
            </SensorCard>
          </div>
        </div>
      </div>
    </section>
  );
}
