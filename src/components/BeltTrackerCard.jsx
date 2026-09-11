import {
  useEffect,
  useState,
} from "react";


export default function BeltTrackerCard() {
  const [belt, setBelt] =
    useState(null);

  const [connected, setConnected] =
    useState(false);


  useEffect(() => {

    const load = async () => {
      try {
        const response =
          await fetch(
            "http://localhost:5000/api/belt/status"
          );

        if (!response.ok) {
          throw new Error();
        }

        const data =
          await response.json();

        setBelt(data);

        setConnected(true);

      } catch {
        setConnected(false);
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


  if (!belt) {
    return (
      <Card>
        Waiting for belt tracker...
      </Card>
    );
  }


  return (
    <Card>

      <Header
        title="Belt Tracking"
        subtitle="Live encoder monitoring"
        connected={connected}
      />


      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <Value
          title="Roller RPM"
          value={belt.rollerRPM}
        />

        <Value
          title="Belt Cycles / Min"
          value={
            belt.beltCyclesPerMinute
          }
        />

        <Value
          title="Completed Cycles"
          value={
            belt.completedBeltCycles
          }
        />

        <Value
          title="Current Position"
          value={
            `${belt.beltPositionMeters} m`
          }
        />

        <Value
          title="Distance Travelled"
          value={
            `${belt.distanceMeters} m`
          }
        />

        <Value
          title="Encoder Pulses"
          value={
            belt.totalPulses
          }
        />

      </div>

    </Card>
  );
}


function Card({ children }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
      {children}
    </div>
  );
}


function Header({
  title,
  subtitle,
  connected,
}) {
  return (
    <div className="flex justify-between mb-5">

      <div>
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>

        <p className="text-sm text-slate-400">
          {subtitle}
        </p>
      </div>


      <span
        className={
          connected
            ? "text-green-400 font-bold"
            : "text-red-400 font-bold"
        }
      >
        {connected
          ? "● LIVE"
          : "● OFFLINE"}
      </span>

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

      <p className="text-xl font-bold text-white mt-1">
        {value}
      </p>

    </div>
  );
}