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

    return this.getStatus();
  }

  getStatus() {
    const beltPosition =
      this.totalDistance %
      this.beltLengthMeters;

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
          this.rpm.toFixed(2)
        ),

      beltCyclesPerMinute:
        Number(
          this.beltCyclesPerMinute.toFixed(2)
        ),

      beltSpeedMetersPerSecond:
        Number(
          beltSpeed.toFixed(3)
        ),
    };
  }
}

module.exports = BeltTracker;