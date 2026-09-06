import {
  Camera,
  Circle,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

export default function LiveFeed() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Live Joint Inspection</h1>

        <p className="text-gray-400 mt-1">
          USB camera monitoring of the conveyor belt inspection zone
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* CAMERA PANEL */}

        <div className="xl:col-span-2 bg-[#0D1728] border border-slate-800 rounded-xl overflow-hidden">

          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Camera className="text-blue-400" size={20} />

              <div>
                <h2 className="font-semibold">
                  Inspection Camera
                </h2>

                <p className="text-xs text-gray-500">
                  Experimental Joint J01
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
              <Circle size={10} fill="currentColor" />
              LIVE
            </div>
          </div>

          {/* PLACEHOLDER CAMERA AREA */}

          <div className="relative h-[500px] bg-black">

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">

                <Camera
                  size={60}
                  className="mx-auto text-gray-700 mb-4"
                />

                <p className="text-gray-500">
                  USB camera feed will appear here
                </p>

                <p className="text-gray-700 text-sm mt-2">
                  Camera integration not connected yet
                </p>

              </div>
            </div>

            {/* INSPECTION BOX */}

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

              <div className="w-64 h-32 border-2 border-green-400 relative">

                <span className="absolute -top-7 left-0 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                  Joint Inspection Zone
                </span>

                <ScanLine
                  className="absolute right-2 top-2 text-green-400"
                  size={18}
                />

              </div>

            </div>

          </div>
        </div>

        {/* AI ANALYSIS */}

        <div className="space-y-5">

          <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">

            <h2 className="font-semibold text-lg mb-5">
              Vision Analysis
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Joint detected
                </span>

                <span className="text-green-400 font-semibold">
                  Yes
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Joint ID
                </span>

                <span className="font-semibold">
                  J01
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Damage detected
                </span>

                <span className="text-green-400 font-semibold">
                  No
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Crack size
                </span>

                <span className="font-semibold">
                  0.0 mm
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Confidence
                </span>

                <span className="font-semibold">
                  96%
                </span>
              </div>

            </div>
          </div>

          {/* CURRENT CONDITION */}

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">

            <div className="flex items-center gap-3 mb-3">

              <ShieldCheck className="text-green-400" />

              <h2 className="text-green-400 font-semibold">
                Joint Healthy
              </h2>

            </div>

            <p className="text-gray-300 text-sm">
              No visible separation, cut or splice damage
              detected in the current inspection.
            </p>

          </div>

          {/* CAMERA STATUS */}

          <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">

            <h2 className="font-semibold mb-4">
              Camera Status
            </h2>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Source
                </span>

                <span>
                  USB Camera
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Processing
                </span>

                <span>
                  Laptop
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Detection
                </span>

                <span>
                  Computer Vision
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Frame Status
                </span>

                <span className="text-yellow-400">
                  Waiting
                </span>
              </div>

            </div>

          </div>

          {/* WARNING */}

          <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">

            <TriangleAlert
              className="text-yellow-400 shrink-0"
              size={20}
            />

            <p className="text-sm text-gray-300">
              Live damage detection will become active after
              the USB camera and vision model are connected.
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}