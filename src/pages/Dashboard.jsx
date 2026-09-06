import JointTable from "../components/JointTable";
import CameraCard from "../components/CameraCard";
import Charts from "../components/Chart";
import Alerts from "../components/Alert";

import { useSensorData } from "../context/SensorContext";

export default function Dashboard() {
  const {
  sensorData,
  simulationMode,
  setSimulationMode,
  backendConnected,
} = useSensorData();

  const getHealthColor = () => {
    if (sensorData.healthScore >= 80) return "text-green-400";
    if (sensorData.healthScore >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskColor = () => {
    if (sensorData.failureRisk === "LOW") return "text-green-400";
    if (sensorData.failureRisk === "MEDIUM") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Conveyor Health Dashboard
        </h1>

        <p className="text-gray-400 mt-1">
          Real-time monitoring of Prototype CB-01
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />

        <div>
          <p className="text-green-400 font-semibold">
            Simulation Running
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
  <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
    <p className="text-gray-400 text-sm mb-3">
      Demo Operating Mode
    </p>

    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => setSimulationMode("NORMAL")}
        className={`px-4 py-2 rounded-lg font-semibold transition ${
          simulationMode === "NORMAL"
            ? "bg-green-500 text-black"
            : "bg-green-500/10 text-green-400 border border-green-500/30"
        }`}
      >
        NORMAL
      </button>

      <button
        onClick={() => setSimulationMode("WARNING")}
        className={`px-4 py-2 rounded-lg font-semibold transition ${
          simulationMode === "WARNING"
            ? "bg-yellow-400 text-black"
            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
        }`}
      >
        WARNING
      </button>

      <button
        onClick={() => setSimulationMode("CRITICAL")}
        className={`px-4 py-2 rounded-lg font-semibold transition ${
          simulationMode === "CRITICAL"
            ? "bg-red-500 text-white"
            : "bg-red-500/10 text-red-400 border border-red-500/30"
        }`}
      >
        CRITICAL
      </button>
    </div>

    <p className="text-gray-500 text-xs mt-3">
      Used only for prototype fault simulation during testing.
    </p>
  </div>

  <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
    <p className="text-gray-400 text-sm mb-3">
      Communication Status
    </p>

    <div className="flex items-center gap-3">
      <span
        className={`w-3 h-3 rounded-full ${
          backendConnected
            ? "bg-green-400 animate-pulse"
            : "bg-red-400"
        }`}
      />

      <div>
        <p
          className={`font-semibold ${
            backendConnected
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {backendConnected
            ? "Backend Connected"
            : "Backend Disconnected"}
        </p>

        <p className="text-gray-500 text-xs mt-1">
          Node.js API — localhost:5000
        </p>
      </div>
    </div>
  </div>
</div>
          </p>

          <p className="text-gray-500 text-xs">
            Central sensor stream updating every 1.5 seconds
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Belt Health
          </p>

          <h2 className={`text-4xl font-bold mt-2 ${getHealthColor()}`}>
            {sensorData.healthScore}

            <span className="text-lg text-gray-500">
              {" "} /100
            </span>
          </h2>

          <p className={`text-sm mt-2 ${getHealthColor()}`}>
            {sensorData.status}
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Vibration
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {sensorData.vibration}

            <span className="text-lg text-gray-500 ml-1">
              mm/s
            </span>
          </h2>

          <p className="text-blue-400 text-sm mt-2">
            ADXL345
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Joint Temperature
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {sensorData.temperature}

            <span className="text-lg text-gray-500 ml-1">
              °C
            </span>
          </h2>

          <p className="text-orange-400 text-sm mt-2">
            MLX90614
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Motor Current
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {sensorData.motorCurrent}

            <span className="text-lg text-gray-500 ml-1">
              A
            </span>
          </h2>

          <p className="text-purple-400 text-sm mt-2">
            INA219
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Belt Speed
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {sensorData.beltSpeed}

            <span className="text-lg text-gray-500 ml-1">
              m/s
            </span>
          </h2>

          <p className="text-blue-400 text-sm mt-2">
            Rotary Encoder
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Belt Alignment
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {sensorData.alignment}

            <span className="text-lg text-gray-500 ml-1">
              mm
            </span>
          </h2>

          <p className="text-cyan-400 text-sm mt-2">
            VL53L0X Left / Right
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Experimental Joint
          </p>

          <h2 className="text-3xl font-bold mt-2">
            J01
          </h2>

          <p className="text-green-400 text-sm mt-2">
            Camera inspection zone
          </p>
        </div>

        <div className="bg-[#0D1728] border border-slate-800 p-5 rounded-xl">
          <p className="text-gray-400 text-sm">
            Failure Risk
          </p>

          <h2 className={`text-3xl font-bold mt-2 ${getRiskColor()}`}>
            {sensorData.failureRisk}
          </h2>

          <p className="text-gray-500 text-sm mt-2">
            Calculated from sensor data
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <JointTable />
        <CameraCard />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        <Charts />
        <Alerts />
      </div>
    </>
  );
}