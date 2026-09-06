export function generateSensorData(mode = "NORMAL") {
  let vibration;
  let temperature;
  let motorCurrent;
  let beltSpeed;
  let alignment;
  let healthScore;
  let status;
  let failureRisk;

  if (mode === "WARNING") {
    vibration = +(5.2 + Math.random() * 1.2).toFixed(2);
    temperature = +(43 + Math.random() * 5).toFixed(1);
    motorCurrent = +(1.45 + Math.random() * 0.3).toFixed(2);
    beltSpeed = +(0.34 + Math.random() * 0.06).toFixed(2);
    alignment = +(1.1 + Math.random() * 1.2).toFixed(2);

    healthScore = Math.floor(65 + Math.random() * 14);
    status = "Warning";
    failureRisk = "MEDIUM";
  }

  else if (mode === "CRITICAL") {
    vibration = +(7.5 + Math.random() * 2).toFixed(2);
    temperature = +(52 + Math.random() * 10).toFixed(1);
    motorCurrent = +(1.8 + Math.random() * 0.6).toFixed(2);
    beltSpeed = +(0.18 + Math.random() * 0.1).toFixed(2);
    alignment = +(3 + Math.random() * 3).toFixed(2);

    healthScore = Math.floor(30 + Math.random() * 25);
    status = "Critical";
    failureRisk = "HIGH";
  }

  else {
    vibration = +(3.2 + Math.random() * 1.2).toFixed(2);
    temperature = +(37 + Math.random() * 4).toFixed(1);
    motorCurrent = +(1.0 + Math.random() * 0.3).toFixed(2);
    beltSpeed = +(0.39 + Math.random() * 0.05).toFixed(2);
    alignment = +(Math.random() * 0.7).toFixed(2);

    healthScore = Math.floor(90 + Math.random() * 11);
    status = "Healthy";
    failureRisk = "LOW";
  }

  return {
    vibration,
    temperature,
    motorCurrent,
    beltSpeed,
    alignment,
    healthScore,
    status,
    failureRisk,
  };
}