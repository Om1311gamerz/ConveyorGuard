import { Camera, ScanLine } from "lucide-react";

import { useSensorData } from "../context/SensorContext";

export default function CameraCard() {
  const { simulationMode } = useSensorData();

  const simulatedDamage =
    simulationMode === "CRITICAL";

  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            Joint Camera Inspection
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Experimental joint J01
          </p>
        </div>

        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Camera size={16} />
          USB Camera
        </div>
      </div>

      <div className="relative bg-black rounded-xl h-[240px] flex items-center justify-center overflow-hidden border border-slate-800">
        <div className="text-center">
          <Camera
            size={48}
            className="mx-auto text-gray-700 mb-3"
          />

          <p className="text-gray-400 font-medium">
            Camera Feed Not Connected
          </p>

          <p className="text-gray-600 text-xs mt-1">
            USB camera stream will appear here
          </p>
        </div>

        <div className="absolute inset-x-10 top-1/2 h-[2px] bg-green-400/40" />

        <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500">
            Inspection Zone
          </p>

          <p className="text-green-400 font-semibold">
            J01
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Vision Status
          </p>

          <p className="text-yellow-400 font-semibold mt-1">
            Simulation
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Joint Detected
          </p>

          <p className="font-semibold mt-1">
            J01
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            Surface Damage
          </p>

          <p
            className={`font-semibold mt-1 ${
              simulatedDamage
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {simulatedDamage
              ? "Simulated Fault"
              : "No Simulated Damage"}
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-500 text-xs">
            AI Model
          </p>

          <p className="text-gray-400 font-semibold mt-1">
            Not Connected
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <ScanLine
          size={18}
          className="text-blue-400 shrink-0 mt-0.5"
        />

        <p className="text-xs text-gray-400">
          Current camera results are only for prototype simulation.
          Real defect detection will activate after the USB camera
          and computer-vision service are connected.
        </p>
      </div>
    </div>
  );
}