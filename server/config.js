const defaults = require("../config/defaults.json");

function validateConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Configuration must be a JSON object");
  }
  const candidate = structuredClone(defaults);
  for (const section of ["thresholds", "hardware"]) {
    const values = input[section] ?? {};
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new TypeError(`Invalid ${section}`);
    for (const [key, value] of Object.entries(values)) {
      if (!(key in candidate[section])) throw new TypeError(`Unknown setting: ${key}`);
      const expected = candidate[section][key];
      if (typeof expected === "boolean") {
        if (typeof value !== "boolean") throw new TypeError(`${key} must be boolean`);
      } else if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`${key} must be a finite number`);
      }
      candidate[section][key] = value;
    }
  }
  const t = candidate.thresholds;
  for (const metric of ["vibration", "temperature", "motorCurrent", "alignment"]) {
    if (t[`${metric}Warning`] <= 0 || t[`${metric}Critical`] <= t[`${metric}Warning`]) {
      throw new TypeError(`${metric}: critical must exceed a positive warning threshold`);
    }
  }
  if (t.beltSpeedLow <= 0) throw new TypeError("beltSpeedLow must be positive");
  const h = candidate.hardware;
  for (const key of ["beltLengthMeters", "rollerDiameterMeters", "encoderPPR", "positionToleranceMeters"]) {
    if (h[key] <= 0) throw new TypeError(`${key} must be positive`);
  }
  if (!Number.isSafeInteger(h.encoderPPR) || h.encoderPPR > 1000000) throw new TypeError("Invalid encoderPPR");
  if (h.positionToleranceMeters >= h.beltLengthMeters / 2) throw new TypeError("Position tolerance must be below half the belt length");
  return candidate;
}

module.exports = { defaults, validateConfig };
