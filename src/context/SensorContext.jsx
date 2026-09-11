// oxlint-disable react/only-export-components -- provider and matching hook share one context module.
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { generateSensorData } from "../data/sensorSimulator";

const SensorContext = createContext();

const DEFAULT_THRESHOLDS = {
  vibrationWarning: 4.8,
  vibrationCritical: 7.0,

  temperatureWarning: 42,
  temperatureCritical: 50,

  motorCurrentWarning: 1.45,
  motorCurrentCritical: 1.8,

  alignmentWarning: 1.0,
  alignmentCritical: 3.0,
};

export function SensorProvider({ children }) {
  const [simulationMode, setSimulationMode] =
    useState("NORMAL");

  const [sensorData, setSensorData] = useState(
    generateSensorData("NORMAL")
  );

  const [history, setHistory] = useState([]);

  const [backendConnected, setBackendConnected] =
    useState(false);

  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem(
      "conveyorThresholds"
    );

    if (!saved) {
      return DEFAULT_THRESHOLDS;
    }

    try {
      return {
        ...DEFAULT_THRESHOLDS,
        ...JSON.parse(saved),
      };
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  });

  const saveThresholds = (newThresholds) => {
    const updatedThresholds = {
      ...DEFAULT_THRESHOLDS,
      ...newThresholds,
    };

    setThresholds(updatedThresholds);

    localStorage.setItem(
      "conveyorThresholds",
      JSON.stringify(updatedThresholds)
    );
  };

  const resetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);

    localStorage.setItem(
      "conveyorThresholds",
      JSON.stringify(DEFAULT_THRESHOLDS)
    );
  };

  useEffect(() => {
    const updateSensors = async () => {
      const reading =
        generateSensorData(simulationMode);

      const newReading = {
        ...reading,
        conveyorId: "CB-01",
        source: "SIMULATOR",
        simulationMode,
        timestamp: new Date(),
      };

      setSensorData(newReading);

      setHistory((previous) => {
        const updated = [
          ...previous,
          newReading,
        ];

        return updated.slice(-20);
      });

      try {
        const response = await fetch(
          "http://localhost:5000/api/sensor-data",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(newReading),
          }
        );

        setBackendConnected(response.ok);
      } catch (error) {
        console.error(
          "Backend connection failed:",
          error
        );

        setBackendConnected(false);
      }
    };

    updateSensors();

    const interval = setInterval(
      updateSensors,
      1500
    );

    return () =>
      clearInterval(interval);
  }, [simulationMode]);

  return (
    <SensorContext.Provider
      value={{
        sensorData,
        history,
        backendConnected,

        simulationMode,
        setSimulationMode,

        thresholds,
        saveThresholds,
        resetThresholds,

        DEFAULT_THRESHOLDS,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensorData() {
  return useContext(SensorContext);
}
