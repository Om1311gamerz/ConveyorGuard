class BeltTracker {
  constructor({
    beltLengthMeters = 2.0,
    rollerDiameterMeters = 0.05,
    encoderPPR = 600,
  } = {}) {
    this.beltLengthMeters = beltLengthMeters;
    this.rollerDiameterMeters = rollerDiameterMeters;
    this.encoderPPR = encoderPPR;

    this.totalPulses = 0;
    this.totalDistance = 0;

    this.lastPulseTime = null;

    this.rpm = 0;
    this.beltCyclesPerMinute = 0;
    this.source = "UNKNOWN";
    this.lastMeasurementAt = null;
    this.positionValid = false;
  }

  addPulses(pulses, timestamp = Date.now()) {
    pulses = Number(pulses);

    if (!Number.isFinite(pulses) || pulses <= 0) {
      return this.getStatus();
    }

    const circumference =
      Math.PI * this.rollerDiameterMeters;

    const rollerRotations =
      pulses / this.encoderPPR;

    const distanceMoved =
      rollerRotations * circumference;

    this.totalPulses += pulses;
    this.totalDistance += distanceMoved;

    if (this.lastPulseTime !== null) {
      const seconds =
        (timestamp - this.lastPulseTime) / 1000;

      if (seconds > 0) {
        const rotationsPerSecond =
          rollerRotations / seconds;

        this.rpm =
          rotationsPerSecond * 60;

        const beltSpeed =
          rotationsPerSecond * circumference;

        this.beltCyclesPerMinute =
          (beltSpeed * 60) /
          this.beltLengthMeters;
      }
    }

    this.lastPulseTime = timestamp;
    this.lastMeasurementAt = timestamp;
    this.positionValid = true;

    return this.getStatus();
  }

  updateEncoder(measurement, now = Date.now()) {
    if (typeof measurement.encoder_count !== "number" || typeof measurement.encoder_rpm !== "number") return;
    const circumference = Math.PI * this.rollerDiameterMeters;
    this.totalPulses = measurement.encoder_a_pulse_count ?? 0;
    this.totalDistance = measurement.encoder_count / (this.encoderPPR * 4) * circumference;
    this.rpm = measurement.encoder_rpm;
    this.beltCyclesPerMinute = Math.abs(this.rpm) * circumference / this.beltLengthMeters;
    this.lastMeasurementAt = now;
    this.positionValid = true;
  }

  getStatus(now = Date.now()) {
    const connected = this.lastMeasurementAt !== null && now - this.lastMeasurementAt <= require("../config/defaults.json").freshness.sensorMs;
    const beltPosition =
      ((this.totalDistance % this.beltLengthMeters) + this.beltLengthMeters) % this.beltLengthMeters;

    const completedCycles =
      Math.floor(
        this.totalDistance /
        this.beltLengthMeters
      );

    const circumference =
      Math.PI * this.rollerDiameterMeters;

    const beltSpeed =
      (this.rpm / 60) *
      circumference;

    return {
      source: this.source,
      connected,
      sampleAgeMs: this.lastMeasurementAt === null ? null : now - this.lastMeasurementAt,
      positionValid: connected && this.positionValid,
      beltLengthMeters:
        this.beltLengthMeters,

      rollerDiameterMeters:
        this.rollerDiameterMeters,

      encoderPPR:
        this.encoderPPR,

      totalPulses:
        this.totalPulses,

      distanceMeters:
        Number(
          this.totalDistance.toFixed(3)
        ),

      beltPositionMeters:
        Number(
          beltPosition.toFixed(3)
        ),

      completedBeltCycles:
        completedCycles,

      rollerRPM:
        Number(
          (connected ? this.rpm : 0).toFixed(2)
        ),

      beltCyclesPerMinute:
        Number(
          (connected ? this.beltCyclesPerMinute : 0).toFixed(2)
        ),

      beltSpeedMetersPerSecond:
        Number(
          (connected ? Math.abs(beltSpeed) : 0).toFixed(3)
        ),
    };
  }
}

module.exports = BeltTracker;
