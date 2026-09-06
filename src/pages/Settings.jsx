import { useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
} from "lucide-react";

export default function Settings() {
  const defaultThresholds = {
    vibrationWarning: 4.8,
    vibrationCritical: 7.0,

    temperatureWarning: 42,
    temperatureCritical: 50,

    motorCurrentWarning: 1.45,
    motorCurrentCritical: 1.8,

    alignmentWarning: 1.0,
    alignmentCritical: 3.0,
  };

  const [thresholds, setThresholds] = useState(defaultThresholds);

  const handleChange = (field, value) => {
    setThresholds((previous) => ({
      ...previous,
      [field]: Number(value),
    }));
  };

  const saveSettings = () => {
    localStorage.setItem(
      "conveyorThresholds",
      JSON.stringify(thresholds)
    );

    alert("Settings saved");
  };

  const resetSettings = () => {
    setThresholds(defaultThresholds);

    localStorage.removeItem(
      "conveyorThresholds"
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          System Settings
        </h1>

        <p className="text-gray-400 mt-1">
          Configure monitoring thresholds for prototype CB-01
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex gap-3">

        <SettingsIcon
          className="text-blue-400 shrink-0"
          size={21}
        />

        <div>
          <p className="text-blue-400 font-semibold">
            Prototype Configuration
          </p>

          <p className="text-gray-400 text-sm mt-1">
            These thresholds are currently used for software
            configuration and testing.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <ThresholdCard
          title="Vibration"
          unit="mm/s"
          warning={thresholds.vibrationWarning}
          critical={thresholds.vibrationCritical}
          onWarningChange={(value) =>
            handleChange(
              "vibrationWarning",
              value
            )
          }
          onCriticalChange={(value) =>
            handleChange(
              "vibrationCritical",
              value
            )
          }
        />

        <ThresholdCard
          title="Temperature"
          unit="°C"
          warning={thresholds.temperatureWarning}
          critical={thresholds.temperatureCritical}
          onWarningChange={(value) =>
            handleChange(
              "temperatureWarning",
              value
            )
          }
          onCriticalChange={(value) =>
            handleChange(
              "temperatureCritical",
              value
            )
          }
        />

        <ThresholdCard
          title="Motor Current"
          unit="A"
          warning={thresholds.motorCurrentWarning}
          critical={thresholds.motorCurrentCritical}
          onWarningChange={(value) =>
            handleChange(
              "motorCurrentWarning",
              value
            )
          }
          onCriticalChange={(value) =>
            handleChange(
              "motorCurrentCritical",
              value
            )
          }
        />

        <ThresholdCard
          title="Belt Alignment"
          unit="mm"
          warning={thresholds.alignmentWarning}
          critical={thresholds.alignmentCritical}
          onWarningChange={(value) =>
            handleChange(
              "alignmentWarning",
              value
            )
          }
          onCriticalChange={(value) =>
            handleChange(
              "alignmentCritical",
              value
            )
          }
        />

      </div>

      <div className="mt-6 flex gap-3">

        <button
          onClick={saveSettings}
          className="flex items-center gap-2 bg-green-500 text-black font-semibold px-5 py-3 rounded-lg hover:bg-green-400"
        >
          <Save size={18} />
          Save Settings
        </button>

        <button
          onClick={resetSettings}
          className="flex items-center gap-2 bg-slate-800 text-gray-300 font-semibold px-5 py-3 rounded-lg hover:bg-slate-700"
        >
          <RotateCcw size={18} />
          Reset Defaults
        </button>

      </div>
    </div>
  );
}

function ThresholdCard({
  title,
  unit,
  warning,
  critical,
  onWarningChange,
  onCriticalChange,
}) {
  return (
    <div className="bg-[#0D1728] border border-slate-800 rounded-xl p-5">

      <h2 className="text-lg font-semibold mb-5">
        {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className="text-sm text-yellow-400">
            Warning Threshold
          </label>

          <div className="flex items-center gap-2 mt-2">

            <input
              type="number"
              step="0.1"
              value={warning}
              onChange={(e) =>
                onWarningChange(e.target.value)
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-yellow-400"
            />

            <span className="text-gray-500">
              {unit}
            </span>

          </div>
        </div>

        <div>
          <label className="text-sm text-red-400">
            Critical Threshold
          </label>

          <div className="flex items-center gap-2 mt-2">

            <input
              type="number"
              step="0.1"
              value={critical}
              onChange={(e) =>
                onCriticalChange(e.target.value)
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
            />

            <span className="text-gray-500">
              {unit}
            </span>

          </div>
        </div>

      </div>
    </div>
  );
}