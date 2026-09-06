import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useSensorData } from "../context/SensorContext";

function SensorChart({ title, unit, data, lineColor }) {
  const currentValue =
    data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-semibold text-lg">
            {title}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Live sensor readings
          </p>
        </div>

        <span className="bg-slate-800 px-3 py-1 rounded-lg font-semibold">
          {currentValue} {unit}
        </span>
      </div>

      <div className="h-[230px]">
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

export default function Charts() {
  const { history } = useSensorData();

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

  return (
    <>
      <SensorChart
        title="Vibration Trend"
        unit="mm/s"
        data={vibrationData}
        lineColor="#8b5cf6"
      />

      <SensorChart
        title="Temperature Trend"
        unit="°C"
        data={temperatureData}
        lineColor="#f59e0b"
      />
    </>
  );
}