import {
  useEffect,
  useState,
} from "react";


export default function VisionCard() {
  const [vision, setVision] =
    useState(null);

  const [apiConnected, setApiConnected] =
    useState(false);


  useEffect(() => {

    const load = async () => {

      try {

        const response =
          await fetch(
            "http://localhost:5000/api/vision/latest"
          );


        if (!response.ok) {
          throw new Error();
        }


        const data =
          await response.json();


        setVision(data);

        setApiConnected(true);


      } catch {

        setApiConnected(false);

      }
    };


    load();


    const timer =
      setInterval(
        load,
        500
      );


    return () =>
      clearInterval(timer);

  }, []);


  if (!vision) {
    return null;
  }


  const aiConnected =
    apiConnected &&
    vision.connected;


  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

      <div className="flex justify-between items-center mb-6">

        <div>

          <h2 className="text-xl font-bold text-white">
            Vision Analysis
          </h2>

          <p className="text-sm text-slate-400">
            YOLO damage detection
          </p>

        </div>


        <div
          className={
            aiConnected
              ? "text-green-400 font-bold"
              : "text-red-400 font-bold"
          }
        >

          {aiConnected
            ? "● AI CONNECTED"
            : "● AI OFFLINE"}

        </div>

      </div>


      {vision.defectDetected ? (

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <Value
            title="Defect ID"
            value={
              vision.defectId
            }
          />

          <Value
            title="Damage Type"
            value={
              vision.type
            }
          />

          <Value
            title="Confidence"
            value={
              `${vision.confidence}%`
            }
          />

          <Value
            title="Visual Severity"
            value={
              `${vision.severity}/100`
            }
          />

          <Value
            title="Belt Position"
            value={
              `${vision.beltPosition} m`
            }
          />

          <Value
            title="Belt Cycle"
            value={
              vision.cycle
            }
          />

          <Value
            title="Times Observed"
            value={
              vision.timesSeen
            }
          />

          <Value
            title="Status"
            value="DAMAGE DETECTED"
          />

        </div>

      ) : (

        <div className="border border-green-800 bg-green-950/30 rounded-lg p-6">

          <p className="text-green-400 text-lg font-bold">
            No visible defect detected
          </p>

          <p className="text-slate-400 mt-1">
            Camera AI is monitoring the conveyor.
          </p>

          <p className="text-sm text-slate-500 mt-3">
            Cycle {vision.cycle} · Position{" "}
            {vision.beltPosition ?? "-"} m
          </p>

        </div>

      )}

    </div>
  );
}


function Value({
  title,
  value,
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-4">

      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p className="text-lg font-semibold text-white mt-1">
        {value}
      </p>

    </div>
  );
}