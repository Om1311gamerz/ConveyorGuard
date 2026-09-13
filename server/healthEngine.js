const { defaults } = require("./config");

const METRICS = [
  ["vibration", "vibration", "m/s²"],
  ["temperature", "temperature", "°C"],
  ["motor_current", "motorCurrent", "A"],
  ["alignment", "alignment", "mm"],
];

function risk(value, warning, critical) {
  if (value === null || value === undefined) return null;
  if (value < warning) return 0;
  return Math.min(100, 45 + (value - warning) / (critical - warning) * 55);
}

function calculateHealth(data = {}, thresholds = defaults.thresholds, vision = null) {
  const signals = {}, risks = {};
  for (const [key, metric, unit] of METRICS) {
    const value = data[key] ?? data[metric] ?? null;
    signals[key] = { value, unit, warning: thresholds[metric + "Warning"], critical: thresholds[metric + "Critical"] };
    risks[key] = risk(value, thresholds[metric + "Warning"], thresholds[metric + "Critical"]);
  }
  const speed = data.belt_speed ?? data.beltSpeed ?? null;
  signals.belt_speed = { value: speed, unit: "m/s", low: thresholds.beltSpeedLow };
  // Low speed alone can mean intentional standstill. Pair it with current for jam classification.
  const visual = vision?.connected && vision?.source === "CAMERA" ? (vision.defectDetected ? vision.severity : 0) : null;
  risks.visualDamage = visual;
  const observed = Object.values(risks).filter(v => v !== null);
  const missing = Object.entries(signals).filter(([, v]) => v.value === null).map(([key]) => key);
  const score = observed.length ? Math.max(0, 100 - Math.max(...observed) * 0.6 - observed.reduce((s, v) => s + v, 0) / observed.length * 0.4) : null;
  const faults = classifyFaults(data, thresholds, vision);
  const severity = faults.some(f => f.severity === "CRITICAL") ? "CRITICAL" : faults.some(f => f.severity === "WARNING") ? "WARNING" : data.emergencyStop ? "STOPPED" : missing.length ? "PARTIAL" : "NORMAL";
  return {
    healthScore: score === null ? null : Number(score.toFixed(1)), condition: severity,
    status: severity === "NORMAL" ? "Healthy" : severity === "WARNING" ? "Warning" : severity === "CRITICAL" ? "Critical" : severity,
    method: "PROTOTYPE_HEURISTIC", signals, risks, faults,
    dataQuality: { missing, availableSignals: 5 - missing.length, totalSignals: 5, visionAvailable: visual !== null },
    explanation: "Threshold-derived condition index; no trained fault model, failure probability or remaining-life estimate.",
    factors: { visualDamage: visual, vibration: signals.vibration.value, temperature: signals.temperature.value, misalignment: signals.alignment.value, motorLoad: signals.motor_current.value },
  };
}

function classifyFaults(data, t = defaults.thresholds, vision = null) {
  const vibration = data.vibration, temperature = data.temperature;
  const current = data.motor_current ?? data.motorCurrent, alignment = data.alignment;
  const speed = data.belt_speed ?? data.beltSpeed;
  const highVibration = vibration != null && vibration >= t.vibrationWarning;
  const highTemp = temperature != null && temperature >= t.temperatureWarning;
  const highCurrent = current != null && current >= t.motorCurrentWarning;
  const highAlignment = alignment != null && alignment >= t.alignmentWarning;
  const lowSpeed = speed != null && speed < t.beltSpeedLow;
  const critical = (value, threshold) => value != null && value >= threshold;
  const faults = [];
  function add(faultType, severe, contributingSignals, explanation, recommendation) {
    faults.push({ faultType, severity: severe ? "CRITICAL" : "WARNING", contributingSignals, explanation, recommendation, method: "PROTOTYPE_HEURISTIC" });
  }
  if (highAlignment) add("BELT_MISALIGNMENT", critical(alignment, t.alignmentCritical), highVibration ? ["alignment", "vibration"] : ["alignment"], highVibration ? "Alignment deviation and dynamic acceleration both exceed their warning thresholds." : "Measured alignment deviation exceeds its warning threshold.", "Inspect belt centering, sensor mounting and idler adjustment during a safe shutdown.");
  if (highCurrent && lowSpeed) add("POSSIBLE_JAM", critical(current, t.motorCurrentCritical), ["motor_current", "belt_speed"], "Elevated measured current coincides with low belt speed; resistance or a jam is possible. Intentional low-speed operation can also cause this pattern.", "Arrange a safe shutdown and inspect obstructions, belt tension and drive resistance.");
  else if (highCurrent) add("MOTOR_OVERLOAD", critical(current, t.motorCurrentCritical), ["motor_current"], "Measured current exceeds the configured prototype threshold; motor ratings have not been inferred.", "Verify load, current-sensor calibration and the motor's rated operating range.");
  if (highVibration && highTemp) add("ROLLER_BEARING_ANOMALY", critical(vibration, t.vibrationCritical) || critical(temperature, t.temperatureCritical), ["vibration", "temperature"], "Elevated dynamic acceleration and temperature form a possible roller/bearing anomaly pattern. The low-rate feature cannot diagnose a bearing fault.", "Inspect roller motion, mounting and lubrication; collect higher-rate vibration data for diagnosis.");
  else {
    if (highVibration) add("HIGH_VIBRATION", critical(vibration, t.vibrationCritical), ["vibration"], "Dynamic acceleration RMS exceeds its configured threshold.", "Check sensor mounting, belt movement and mechanical vibration.");
    if (highTemp) add("HIGH_TEMPERATURE", critical(temperature, t.temperatureCritical), ["temperature"], "Measured object temperature exceeds its configured threshold.", "Inspect the monitored surface and verify emissivity, field of view and thermal loading.");
  }
  if (vision?.connected && vision.source === "CAMERA" && vision.defectDetected) add("BELT_JOINT_DAMAGE", vision.severity >= 70, ["vision"], "The active YOLO worker reports " + vision.type + "; confidence is a model score, not validated accuracy.", "Review the annotated image and inspect the affected belt surface during a safe shutdown.");
  return faults;
}

module.exports = { calculateHealth, classifyFaults, risk };
