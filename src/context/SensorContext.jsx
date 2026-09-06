import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { generateSensorData } from "../data/sensorSimulator";

const SensorContext = createContext();

export function SensorProvider({ children }) {
  const [simulationMode, setSimulationMode] = useState("NORMAL");

  const [sensorData, setSensorData] = useState(
    generateSensorData("NORMAL")
  );

  const [history, setHistory] = useState([]);

  const [backendConnected, setBackendConnected] =
    useState(false);

  useEffect(() => {
    const updateSensors = async () => {
      const reading = generateSensorData(simulationMode);

      const newReading = {
        ...reading,
        conveyorId: "CB-01",
        source: "SIMULATOR",
        simulationMode,
        timestamp: new Date(),
      };

      setSensorData(newReading);

      setHistory((previous) => {
        const updated = [...previous, newReading];
        return updated.slice(-20);
      });

      try {
        const response = await fetch(
          "http://localhost:5000/api/sensor-data",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(newReading),
          }
        );

        setBackendConnected(response.ok);
      } catch (error) {
        console.error("Backend connection failed:", error);
        setBackendConnected(false);
      }
    };

    updateSensors();

    const interval = setInterval(updateSensors, 1500);

    return () => clearInterval(interval);
  }, [simulationMode]);

  return (
    <SensorContext.Provider
      value={{
        sensorData,
        history,
        backendConnected,
        simulationMode,
        setSimulationMode,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensorData() {
  return useContext(SensorContext);
}