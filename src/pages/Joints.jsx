import {
  Activity,
  Thermometer,
  Gauge,
  MoveHorizontal,
  Camera,
} from "lucide-react";

import { useSensorData } from "../context/SensorContext";

export default function Joints() {
  const { sensorData } = useSensorData();

  const healthColor =
    sensorData.healthScore >= 80
      ? "text-green-400"
      : sensorData.healthScore >= 60
      ? "text-yellow-400"
      : "text-red-400";

  const statusColor =
    sensorData.status === "Healthy"
      ? "text-green-400"
      : sensorData.status === "Warning"
      ? "text-yellow-400"
      : "text-red-400";

  const healthBar =
    sensorData.healthScore >= 80
      ? "bg-green-400"
      : sensorData.healthScore >= 60
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Joint & Component Monitoring
        </h1>

        <p className="text-gray-400 mt-1">
          Prototype CB-01 condition monitoring
        </p>
      </div>

      {/* MAIN J01 CARD */}
      <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-6 mb-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

          <div>
            <p className="text-gray-500 text-sm">
              Experimental Belt Joint
            </p>

            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-bold">
                J01
              </h2>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor} bg-slate-900`}
              >
                {sensorData.status}
              </span>
            </div>

            <p className="text-gray-500 text-sm mt-2">
              Primary camera inspection zone
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-gray-500 text-sm">
              Health Score
            </p>

            <p className={`text-5xl font-bold ${healthColor}`}>
              {sensorData.healthScore}
              <span className="text-lg text-gray-500">
                /100
              </span>
            </p>
          </div>

        </div>

        <div className="w-full bg-slate-800 rounded-full h-3 mt-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${healthBar}`}
            style={{
              width: `${sensorData.healthScore}%`,
            }}
          />
        </div>

      </div>

      {/* SENSOR VALUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <SensorBox
          icon={<Activity />}
          title="Vibration"
          value={`${sensorData.vibration} mm/s`}
          sensor="ADXL345"
        />

        <SensorBox
          icon={<Thermometer />}
          title="Temperature"
          value={`${sensorData.temperature} °C`}
          sensor="MLX90614"
        />

        <SensorBox
          icon={<Gauge />}
          title="Motor Current"
          value={`${sensorData.motorCurrent} A`}
          sensor="INA219"
        />

        <SensorBox
          icon={<MoveHorizontal />}
          title="Alignment"
          value={`${sensorData.alignment} mm`}
          sensor="2 × VL53L0X"
        />

      </div>

      {/* MONITORED ASSEMBLIES */}
      <div className="bg-[#0D1728] border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold">
            Monitored Assemblies
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Physical components monitored on prototype CB-01
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead>
              <tr className="text-gray-500 border-b border-slate-800">
                <th className="text-left p-4">ID</th>
                <th className="text-left p-4">Component</th>
                <th className="text-left p-4">Monitoring</th>
                <th className="text-left p-4">Current State</th>
              </tr>
            </thead>

            <tbody>

              <AssemblyRow
                id="J01"
                component="Experimental Belt Joint"
                monitoring="Camera + Temperature"
                state={sensorData.status}
                status={sensorData.status}
              />

              <AssemblyRow
                id="DR-01"
                component="Drive Roller / Motor"
                monitoring="Current + Speed"
                state={`${sensorData.motorCurrent} A`}
                status={sensorData.status}
              />

              <AssemblyRow
                id="ID-01"
                component="Adjustable Idler"
                monitoring="Alignment + Vibration"
                state={`${sensorData.alignment} mm`}
                status={sensorData.status}
              />

              <AssemblyRow
                id="BR-01"
                component="Bearing / Roller Assembly"
                monitoring="Vibration + Temperature"
                state={`${sensorData.vibration} mm/s`}
                status={sensorData.status}
              />

            </tbody>
          </table>
        </div>
      </div>

      {/* CAMERA INFO */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">

        <Camera
          className="text-blue-400 shrink-0"
          size={21}
        />

        <div>
          <p className="text-blue-400 font-semibold">
            Computer Vision Inspection
          </p>

          <p className="text-gray-400 text-sm mt-1">
            J01 is the dedicated visual inspection point.
            Camera-based defect detection is not yet connected
            and is currently represented only in simulation.
          </p>
        </div>

      </div>
    </div>
  );
}

function SensorBox({ icon, title, value, sensor }) {
  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">

      <div className="text-blue-400 mb-4">
        {icon}
      </div>

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>

      <p className="text-xs text-gray-500 mt-2">
        {sensor}
      </p>

    </div>
  );
}

function AssemblyRow({
  id,
  component,
  monitoring,
  state,
  status,
}) {
  const color =
    status === "Healthy"
      ? "text-green-400"
      : status === "Warning"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <tr className="border-b border-slate-800/60 last:border-0">

      <td className="p-4 font-semibold">
        {id}
      </td>

      <td className="p-4">
        {component}
      </td>

      <td className="p-4 text-gray-400">
        {monitoring}
      </td>

      <td className={`p-4 font-semibold ${color}`}>
        {state}
      </td>

    </tr>
  );
}