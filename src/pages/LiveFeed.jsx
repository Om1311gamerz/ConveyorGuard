import {
  Camera,
  Circle,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

export default function LiveFeed() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");

  const startCamera = useCallback(async (deviceId = "") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setCameraError("");

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : true,
        audio: false,
      };

      const newStream =
        await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      setCameraConnected(true);

      const availableDevices =
        await navigator.mediaDevices.enumerateDevices();

      const videoDevices = availableDevices.filter(
        (device) => device.kind === "videoinput"
      );

      setDevices(videoDevices);

      if (!deviceId && videoDevices.length > 0) {
        const currentTrack =
          newStream.getVideoTracks()[0];

        const settings = currentTrack.getSettings();

        if (settings.deviceId) {
          setSelectedDevice(settings.deviceId);
        }
      }
    } catch (error) {
      console.error("Camera error:", error);

      setCameraConnected(false);

      if (error.name === "NotAllowedError") {
        setCameraError("Camera permission was denied.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera was found.");
      } else {
        setCameraError("Unable to access the camera.");
      }
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- camera permission and stream state are initialized on mount.
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  const changeCamera = async (event) => {
    const deviceId = event.target.value;

    setSelectedDevice(deviceId);

    await startCamera(deviceId);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Live Joint Inspection
        </h1>

        <p className="text-gray-400 mt-1">
          USB camera monitoring of the conveyor belt inspection zone
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* CAMERA PANEL */}

        <div className="xl:col-span-2 bg-[#0D1728] border border-slate-800 rounded-xl overflow-hidden">

          <div className="p-5 border-b border-slate-800 flex justify-between items-center">

            <div className="flex items-center gap-3">

              <Camera
                className="text-blue-400"
                size={20}
              />

              <div>
                <h2 className="font-semibold">
                  Inspection Camera
                </h2>

                <p className="text-xs text-gray-500">
                  Experimental Joint J01
                </p>
              </div>

            </div>

            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                cameraConnected
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              <Circle
                size={10}
                fill="currentColor"
              />

              {cameraConnected
                ? "LIVE"
                : "OFFLINE"}
            </div>

          </div>

          {/* CAMERA AREA */}

          <div className="relative h-[500px] bg-black">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!cameraConnected && (
              <div className="absolute inset-0 flex items-center justify-center">

                <div className="text-center">

                  <Camera
                    size={60}
                    className="mx-auto text-gray-700 mb-4"
                  />

                  <p className="text-gray-500">
                    Camera feed unavailable
                  </p>

                  {cameraError && (
                    <p className="text-red-400 text-sm mt-2">
                      {cameraError}
                    </p>
                  )}

                  <button
                    onClick={() => startCamera()}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
                  >
                    Retry Camera
                  </button>

                </div>

              </div>
            )}

            {/* INSPECTION BOX */}

            {cameraConnected && (
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
            )}

          </div>

          {/* CAMERA SELECTOR */}

          {devices.length > 1 && (
            <div className="p-4 border-t border-slate-800">

              <label className="text-sm text-gray-400">
                Camera Source
              </label>

              <select
                value={selectedDevice}
                onChange={changeCamera}
                className="mt-2 w-full bg-[#08111F] border border-slate-700 rounded-lg px-3 py-2 outline-none"
              >
                {devices.map((device, index) => (
                  <option
                    key={device.deviceId}
                    value={device.deviceId}
                  >
                    {device.label ||
                      `Camera ${index + 1}`}
                  </option>
                ))}
              </select>

            </div>
          )}

        </div>

        {/* ANALYSIS PANEL */}

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

                <span className="text-gray-500 font-semibold">
                  Not Available
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

                <span className="text-gray-500 font-semibold">
                  Not Available
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Crack size
                </span>

                <span className="text-gray-500 font-semibold">
                  Not Available
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  Confidence
                </span>

                <span className="text-gray-500 font-semibold">
                  Not Available
                </span>
              </div>

            </div>

          </div>

          {/* CURRENT CONDITION */}

          <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-5">

            <div className="flex items-center gap-3 mb-3">

              <ShieldCheck className="text-gray-400" />

              <h2 className="text-gray-300 font-semibold">
                Vision Model Not Connected
              </h2>

            </div>

            <p className="text-gray-400 text-sm">
              The camera feed is available, but automatic
              defect detection has not been activated yet.
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
                  Browser Camera
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-400">
                  Connection
                </span>

                <span
                  className={
                    cameraConnected
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {cameraConnected
                    ? "Connected"
                    : "Disconnected"}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-400">
                  Processing
                </span>

                <span>
                  Laptop Browser
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-400">
                  Detection
                </span>

                <span className="text-yellow-400">
                  Not Connected
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-400">
                  Frame Status
                </span>

                <span
                  className={
                    cameraConnected
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {cameraConnected
                    ? "Receiving"
                    : "Waiting"}
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
              Computer-vision damage detection will be
              added after the live camera feed is verified.
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}
