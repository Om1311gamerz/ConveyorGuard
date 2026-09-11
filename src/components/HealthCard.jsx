import {
  useEffect,
  useState,
} from "react";


export default function HealthCard() {
  const [health, setHealth] =
    useState(null);


  useEffect(() => {

    const load = async () => {
      try {
        const response =
          await fetch(
            "http://localhost:5000/api/health/latest"
          );

        const data =
          await response.json();

        setHealth(data);

      } catch {
        // Keep last known value
      }
    };


    load();

    const timer =
      setInterval(
        load,
        750
      );


    return () =>
      clearInterval(timer);

  }, []);


  if (!health) {
    return null;
  }


  const score =
    Number(
      health.healthScore || 0
    );


  const condition =
    health.condition ||
    "UNKNOWN";


  let conditionClass =
    "text-red-400";


  if (score >= 90) {
    conditionClass =
      "text-green-400";

  } else if (score >= 75) {
    conditionClass =
      "text-lime-400";

  } else if (score >= 50) {
    conditionClass =
      "text-yellow-400";

  } else if (score >= 25) {
    conditionClass =
      "text-orange-400";
  }


  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

      <div className="mb-6">

        <h2 className="text-xl font-bold text-white">
          Belt Health
        </h2>

        <p className="text-sm text-slate-400">
          Camera + sensor fusion
        </p>

      </div>


      <div className="text-center mb-6">

        <div
          className={
            `text-6xl font-bold ${conditionClass}`
          }
        >
          {score}
        </div>


        <div className="text-slate-400">
          / 100
        </div>


        <div
          className={
            `text-xl font-bold mt-2 ${conditionClass}`
          }
        >
          {condition}
        </div>

      </div>


      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        <Value
          title="Visual Damage"
          value={
            `${health.factors?.visualDamage ?? 0}`
          }
        />

        <Value
          title="Vibration"
          value={
            health.factors?.vibration ?? 0
          }
        />

        <Value
          title="Temperature"
          value={
            `${health.factors?.temperature ?? 0} °C`
          }
        />

        <Value
          title="Misalignment"
          value={
            `${health.factors?.misalignment ?? 0} mm`
          }
        />

        <Value
          title="Motor Load"
          value={
            health.factors?.motorLoad ?? 0
          }
        />

      </div>

    </div>
  );
}


function Value({
  title,
  value,
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-3">

      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p className="text-lg font-bold text-white mt-1">
        {value}
      </p>

    </div>
  );
}