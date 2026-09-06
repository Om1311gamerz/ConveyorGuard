import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  Activity,
  Thermometer,
  Gauge,
  MoveHorizontal,
} from "lucide-react";

import { useSensorData } from "../context/SensorContext";

export default function Analytics() {
  const { sensorData, history } = useSensorData();

  const vibrationData = history.map((reading) => ({
    time: reading.timestamp.toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit",
    }),
    value: reading.vibration,
  }));

  const temperatureData = history.map((reading) => ({
    time: reading.timestamp.toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit",
    }),
    value: reading.temperature,
  }));

  const motorCurrentData = history.map((reading) => ({
    time: reading.timestamp.toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit",
    }),
    value: reading.motorCurrent,
  }));

  const alignmentData = history.map((reading) => ({
    time: reading.timestamp.toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit",
    }),
    value: reading.alignment,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Conveyor Analytics
        </h1>

        <p className="text-gray-400 mt-1">
          Live condition trends for prototype CB-01
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <MetricCard
          icon={<Activity />}
          title="Vibration"
          value={`${sensorData.vibration} mm/s`}
          subtitle="ADXL345"
        />

        <MetricCard
          icon={<Thermometer />}
          title="Temperature"
          value={`${sensorData.temperature} °C`}
          subtitle="MLX90614"
        />

        <MetricCard
          icon={<Gauge />}
          title="Motor Current"
          value={`${sensorData.motorCurrent} A`}
          subtitle="INA219"
        />

        <MetricCard
          icon={<MoveHorizontal />}
          title="Alignment"
          value={`${sensorData.alignment} mm`}
          subtitle="VL53L0X"
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <AnalyticsChart
          title="Vibration Trend"
          unit="mm/s"
          data={vibrationData}
          lineColor="#8b5cf6"
        />

        <AnalyticsChart
          title="Temperature Trend"
          unit="°C"
          data={temperatureData}
          lineColor="#f59e0b"
        />

        <AnalyticsChart
          title="Motor Current Trend"
          unit="A"
          data={motorCurrentData}
          lineColor="#06b6d4"
        />

        <AnalyticsChart
          title="Alignment Trend"
          unit="mm"
          data={alignmentData}
          lineColor="#22c55e"
        />

      </div>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
}) {
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
        {subtitle}
      </p>
    </div>
  );
}

function AnalyticsChart({
  title,
  unit,
  data,
  lineColor,
}) {
  const currentValue =
    data.length > 0
      ? data[data.length - 1].value
      : 0;

  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">

      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-semibold text-lg">
            {title}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Latest 20 sensor readings
          </p>
        </div>

        <span className="bg-slate-800 px-3 py-1 rounded-lg font-semibold">
          {currentValue} {unit}
        </span>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
            />

            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
              }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}