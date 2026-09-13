function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("JSON object required");
  return value;
}

function number(value, name, min = -Infinity, max = Infinity, optional = true) {
  if (value === null || value === undefined) {
    if (optional) return null;
    throw new TypeError(`${name} is required`);
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${name} must be a finite number between ${min} and ${max}`);
  }
  return value;
}

function text(value, name, fallback) {
  value = value ?? fallback;
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.-]{1,64}$/.test(value)) throw new TypeError(`Invalid ${name}`);
  return value;
}

function sensor(input) {
  object(input);
  const source = input.source ?? "UNKNOWN";
  if (!["ESP32", "SIMULATOR", "UNKNOWN"].includes(source)) throw new TypeError("source must be ESP32, SIMULATOR or UNKNOWN");
  const simulationMode = source === "SIMULATOR" ? input.simulationMode : null;
  if (source === "SIMULATOR" && !["NORMAL", "WARNING", "CRITICAL"].includes(simulationMode)) throw new TypeError("SIMULATOR packets require simulationMode");
  if (input.emergencyStop !== undefined && typeof input.emergencyStop !== "boolean") throw new TypeError("emergencyStop must be boolean");
  const result = {
    conveyorId: text(input.conveyorId, "conveyorId", "CB-01"), source, simulationMode,
    vibration: number(input.vibration, "vibration (dynamic acceleration RMS, m/s²)", 0, 500),
    temperature: number(input.temperature, "temperature (°C)", -70, 400),
    motor_current: number(input.motor_current ?? input.motorCurrent ?? input.current, "motorCurrent (A)", 0, 1000),
    alignment: number(input.alignment, "alignment (mm)", 0, 10000),
    alignmentLeft: number(input.alignmentLeft, "alignmentLeft (mm)", 0, 10000),
    alignmentRight: number(input.alignmentRight, "alignmentRight (mm)", 0, 10000),
    rpm: number(input.rpm, "rpm", -100000, 100000),
    belt_speed: number(input.belt_speed ?? input.beltSpeed, "beltSpeed (m/s)", 0, 100),
    beltPosition: number(input.beltPosition, "beltPosition (m)", 0, 100000),
    emergencyStop: input.emergencyStop ?? false,
  };
  if ([result.vibration, result.temperature, result.motor_current, result.alignment, result.belt_speed].every(v => v === null)) throw new TypeError("At least one measured health signal is required");
  return result;
}

function limit(query, fallback = 100) {
  const value = query.limit === undefined ? fallback : Number(query.limit);
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000) throw new TypeError("limit must be an integer from 1 to 1000");
  return value;
}

function filters(query) {
  const clauses = [], params = [];
  if (query.source !== undefined && !["ESP32", "SIMULATOR", "UNKNOWN", "CAMERA", "FILE"].includes(query.source)) throw new TypeError("Invalid source filter");
  for (const [key, column] of [["source", "source"], ["conveyorId", "conveyor_id"]]) {
    if (query[key] !== undefined) { clauses.push(`${column} = ?`); params.push(text(query[key], key)); }
  }
  for (const [key, op] of [["from", ">="], ["to", "<="]]) {
    if (query[key] !== undefined) {
      const ms = Date.parse(query[key]);
      if (!Number.isFinite(ms)) throw new TypeError(`Invalid ${key} timestamp`);
      clauses.push(`julianday(timestamp) ${op} julianday(?)`); params.push(new Date(ms).toISOString());
    }
  }
  if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to)) throw new TypeError("from must precede to");
  return { where: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", params };
}

module.exports = { object, number, text, sensor, limit, filters };
