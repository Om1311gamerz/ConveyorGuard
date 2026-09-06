import { useSensorData } from "../context/SensorContext";

export default function JointTable() {
  const { sensorData } = useSensorData();

  const statusColor =
    sensorData.status === "Healthy"
      ? "text-green-400"
      : sensorData.status === "Warning"
      ? "text-yellow-400"
      : "text-red-400";

  const healthBarColor =
    sensorData.healthScore >= 80
      ? "bg-green-400"
      : sensorData.healthScore >= 60
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">
          Experimental Joint Monitoring
        </h2>

        <p className="text-xs text-gray-500 mt-1">
          Prototype CB-01 — inspection joint J01
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-slate-800">
              <th className="text-left py-3">
                Joint
              </th>

              <th className="text-left py-3">
                Health
              </th>

              <th className="text-left py-3">
                Status
              </th>

              <th className="text-left py-3">
                Temperature
              </th>

              <th className="text-left py-3">
                Inspection
              </th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-slate-800/50">
              <td className="py-4 font-semibold">
                J01
              </td>

              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${healthBarColor}`}
                      style={{
                        width: `${sensorData.healthScore}%`,
                      }}
                    />
                  </div>

                  <span>
                    {sensorData.healthScore}%
                  </span>
                </div>
              </td>

              <td className={`py-4 font-semibold ${statusColor}`}>
                {sensorData.status}
              </td>

              <td className="py-4">
                {sensorData.temperature} °C
              </td>

              <td className="py-4 text-blue-400">
                Camera Zone
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Belt Alignment
          </p>

          <p className="font-semibold mt-1">
            {sensorData.alignment} mm
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Belt Speed
          </p>

          <p className="font-semibold mt-1">
            {sensorData.beltSpeed} m/s
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Failure Risk
          </p>

          <p
            className={`font-semibold mt-1 ${
              sensorData.failureRisk === "LOW"
                ? "text-green-400"
                : sensorData.failureRisk === "MEDIUM"
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {sensorData.failureRisk}
          </p>
        </div>
      </div>
    </div>
  );
}