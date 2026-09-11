const LIVE_WINDOW_MS = 600;

const MEASUREMENT_NUMBER_FIELDS = [
  "time_ms",
  "accel_x",
  "accel_y",
  "accel_z",
  "vibration_magnitude",
  "ambient_temp",
  "object_temp",
  "bus_voltage_v",
  "shunt_voltage_mv",
  "load_voltage_v",
  "current_ma",
  "power_mw",
  "left_tof_mm",
  "left_tof_status",
  "right_tof_mm",
  "right_tof_status",
  "encoder_a",
  "encoder_b",
  "encoder_a_pulse_count",
  "encoder_count",
  "encoder_invalid_transitions",
  "encoder_revolutions",
  "encoder_a_pulses_per_sec",
  "encoder_counts_per_sec",
  "encoder_rpm",
  "motor_command_sequence",
  "motor_target_percent",
  "motor_pwm_percent",
];

const SENSOR_BOOLEAN_FIELDS = [
  "adxl345_ok",
  "mlx90614_ok",
  "ina219_ok",
  "left_tof_ok",
  "right_tof_ok",
  "motor_estop_latched",
  "motor_command_fresh",
  "motor_run_requested",
  "motor_relay_on",
];

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function sanitizeAddressList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (address) =>
        typeof address === "string" &&
        /^0x[0-9a-f]{2}$/i.test(address),
    )
    .slice(0, 127);
}

function sanitizeStartup(payload) {
  const startup = {
    type: "startup",
    bus1_addresses: sanitizeAddressList(payload.bus1_addresses),
    bus2_addresses: sanitizeAddressList(payload.bus2_addresses),
    encoder_ready: booleanOrNull(payload.encoder_ready),
    motor_control_ready: booleanOrNull(payload.motor_control_ready),
    motor_pin_ena: finiteNumberOrNull(payload.motor_pin_ena),
    motor_pin_in1: finiteNumberOrNull(payload.motor_pin_in1),
    motor_pin_in2: finiteNumberOrNull(payload.motor_pin_in2),
    relay_pin: finiteNumberOrNull(payload.relay_pin),
    pulses_per_revolution: finiteNumberOrNull(payload.pulses_per_revolution),
    counts_per_revolution: finiteNumberOrNull(payload.counts_per_revolution),
  };

  for (const field of SENSOR_BOOLEAN_FIELDS) {
    startup[field] = booleanOrNull(payload[field]);
  }

  return startup;
}

function sanitizeMeasurement(payload) {
  const measurement = {
    type: "measurement",
    encoder_direction:
      typeof payload.encoder_direction === "string"
        ? payload.encoder_direction.slice(0, 24)
        : "STOPPED",
  };

  for (const field of SENSOR_BOOLEAN_FIELDS) {
    measurement[field] = booleanOrNull(payload[field]);
  }

  for (const field of MEASUREMENT_NUMBER_FIELDS) {
    measurement[field] = finiteNumberOrNull(payload[field]);
  }

  return measurement;
}

class HardwareState {
  constructor() {
    this.startup = null;
    this.measurement = null;
    this.lastReceivedAt = null;
    this.measurementReceivedAt = null;
  }

  update(payload, now = Date.now()) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("JSON object required");
    }

    if (payload.type === "startup") {
      this.startup = sanitizeStartup(payload);
    } else if (payload.type === "measurement") {
      this.measurement = sanitizeMeasurement(payload);
      this.measurementReceivedAt = now;
    } else {
      throw new TypeError("type must be startup or measurement");
    }

    this.lastReceivedAt = now;
    return this.snapshot(now);
  }

  snapshot(now = Date.now()) {
    const lastReceivedMs = this.lastReceivedAt
      ? Math.max(0, now - this.lastReceivedAt)
      : null;
    const sampleAgeMs = this.measurementReceivedAt
      ? Math.max(0, now - this.measurementReceivedAt)
      : null;

    return {
      connected:
        lastReceivedMs !== null &&
        lastReceivedMs <= LIVE_WINDOW_MS,
      liveWindowMs: LIVE_WINDOW_MS,
      lastReceivedAt:
        this.lastReceivedAt !== null
          ? new Date(this.lastReceivedAt).toISOString()
          : null,
      sampleAgeMs,
      startup: this.startup,
      measurement: this.measurement,
    };
  }
}

module.exports = HardwareState;
