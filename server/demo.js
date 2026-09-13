function generateDemo(mode, thresholds, tick = 0) {
  const ratio = mode === "CRITICAL" ? 1.1 : mode === "WARNING" ? 0.55 : -0.6;
  const jitter = Math.sin(tick * 0.7) * 0.025;
  const sample = metric => {
    const warning = thresholds[`${metric}Warning`], critical = thresholds[`${metric}Critical`];
    return Number(Math.max(0, warning + (critical - warning) * (ratio + jitter)).toFixed(3));
  };
  return {
    conveyorId: "CB-01", source: "SIMULATOR", simulationMode: mode,
    vibration: sample("vibration"), temperature: sample("temperature"),
    motorCurrent: sample("motorCurrent"), alignment: sample("alignment"),
    beltSpeed: Number((thresholds.beltSpeedLow * (mode === "CRITICAL" ? 0.4 : 1.4)).toFixed(3)),
    emergencyStop: false,
  };
}
module.exports = { generateDemo };
