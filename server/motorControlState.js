const MAX_SPEED_PERCENT = 100;

function normalizeSpeed(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError("speedPercent must be a finite number");
  }
  return Math.round(Math.min(MAX_SPEED_PERCENT, Math.max(0, parsed)));
}

class MotorControlState {
  constructor() {
    this.sequence = 1;
    this.emergencyStop = true;
    this.armed = false;
    this.running = false;
    this.speedPercent = 0;
    this.updatedAt = Date.now();
    this.reason = "Backend started with emergency stop latched";
  }

  touch(reason) {
    this.sequence = (this.sequence + 1) >>> 0;
    this.updatedAt = Date.now();
    this.reason = reason;
  }

  engageEmergencyStop(reason = "Emergency stop requested") {
    this.emergencyStop = true;
    this.armed = false;
    this.running = false;
    this.speedPercent = 0;
    this.touch(reason);
    return this.snapshot();
  }

  resetEmergencyStop(hardwareConnected) {
    if (!hardwareConnected) {
      throw new Error("Compatible motor-control firmware must be connected before resetting the emergency stop");
    }
    this.emergencyStop = false;
    this.armed = false;
    this.running = false;
    this.speedPercent = 0;
    this.touch("Emergency stop reset; motor remains disarmed");
    return this.snapshot();
  }

  arm(hardwareConnected) {
    if (!hardwareConnected) {
      throw new Error("Compatible motor-control firmware must be connected before arming the motor");
    }
    if (this.emergencyStop) {
      throw new Error("Reset the emergency stop before arming the motor");
    }
    if (this.speedPercent !== 0 || this.running) {
      throw new Error("Motor speed must be zero before arming");
    }
    this.armed = true;
    this.touch("Motor armed at zero speed");
    return this.snapshot();
  }

  setSpeed(value, hardwareConnected) {
    if (!hardwareConnected) {
      throw new Error("Compatible motor-control firmware is not connected");
    }
    if (this.emergencyStop || !this.armed) {
      throw new Error("Reset and arm the motor before changing speed");
    }
    this.speedPercent = normalizeSpeed(value);
    if (this.speedPercent === 0) this.running = false;
    this.touch(
      this.speedPercent === 0
        ? "Speed set to zero"
        : `Target speed set to ${this.speedPercent}%`,
    );
    return this.snapshot();
  }

  start(hardwareConnected) {
    if (!hardwareConnected) {
      throw new Error("Compatible motor-control firmware is not connected");
    }
    if (this.emergencyStop || !this.armed) {
      throw new Error("Reset and arm the motor before starting");
    }
    if (this.speedPercent <= 0) {
      throw new Error("Choose a speed above zero before starting");
    }
    this.running = true;
    this.touch(`Motor start requested at ${this.speedPercent}%`);
    return this.snapshot();
  }

  stop(reason = "Motor stopped") {
    this.running = false;
    this.armed = false;
    this.speedPercent = 0;
    this.touch(reason);
    return this.snapshot();
  }

  command() {
    return {
      sequence: this.sequence,
      emergencyStop: this.emergencyStop,
      run: this.running && this.armed && !this.emergencyStop,
      speedPercent:
        this.running && this.armed && !this.emergencyStop
          ? this.speedPercent
          : 0,
    };
  }

  snapshot() {
    return {
      sequence: this.sequence,
      emergencyStop: this.emergencyStop,
      armed: this.armed,
      running: this.running,
      speedPercent: this.speedPercent,
      updatedAt: new Date(this.updatedAt).toISOString(),
      reason: this.reason,
    };
  }
}

module.exports = MotorControlState;
module.exports.normalizeSpeed = normalizeSpeed;
