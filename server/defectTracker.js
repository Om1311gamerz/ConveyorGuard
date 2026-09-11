class DefectTracker {
  constructor({
    beltLengthMeters = 2.0,
    positionToleranceMeters = 0.20,
  } = {}) {
    this.beltLengthMeters =
      beltLengthMeters;

    this.positionToleranceMeters =
      positionToleranceMeters;

    this.defects = [];

    this.nextId = 1;
  }

  circularDistance(a, b) {
    const direct =
      Math.abs(a - b);

    return Math.min(
      direct,
      this.beltLengthMeters - direct
    );
  }

  recordDetection({
    type,
    confidence,
    severity,
    beltPosition,
    cycle,
  }) {
    type = String(type);

    confidence =
      Number(confidence || 0);

    severity =
      Number(severity || 0);

    beltPosition =
      Number(beltPosition);

    cycle =
      Number(cycle || 0);

    // ------------------------------------------
    // FIND SAME DEFECT
    // ------------------------------------------

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const defect of this.defects) {
      if (defect.type !== type) {
        continue;
      }

      const distance =
        this.circularDistance(
          defect.position,
          beltPosition
        );

      if (
        distance <=
          this.positionToleranceMeters &&
        distance < bestDistance
      ) {
        bestMatch = defect;
        bestDistance = distance;
      }
    }

    // ------------------------------------------
    // EXISTING DEFECT
    // ------------------------------------------

    if (bestMatch) {
      bestMatch.lastSeenCycle =
        cycle;

      bestMatch.latestConfidence =
        confidence;

      bestMatch.latestSeverity =
        severity;

      bestMatch.maxSeverity =
        Math.max(
          bestMatch.maxSeverity,
          severity
        );

      // Count once per cycle
      if (
        bestMatch.lastCountedCycle !==
        cycle
      ) {
        bestMatch.timesSeen += 1;

        bestMatch.lastCountedCycle =
          cycle;

        bestMatch.history.push({
          cycle,
          confidence,
          severity,
          position:
            beltPosition,

          timestamp:
            new Date().toISOString(),
        });
      }

      return {
        isNewDefect: false,
        distanceFromKnownPosition:
          Number(
            bestDistance.toFixed(3)
          ),

        defect:
          bestMatch,
      };
    }

    // ------------------------------------------
    // NEW DEFECT
    // ------------------------------------------

    const defect = {
      id:
        `D${String(
          this.nextId
        ).padStart(2, "0")}`,

      type,

      position:
        beltPosition,

      firstSeenCycle:
        cycle,

      lastSeenCycle:
        cycle,

      lastCountedCycle:
        cycle,

      timesSeen:
        1,

      latestConfidence:
        confidence,

      latestSeverity:
        severity,

      maxSeverity:
        severity,

      history: [
        {
          cycle,
          confidence,
          severity,
          position:
            beltPosition,

          timestamp:
            new Date().toISOString(),
        },
      ],
    };

    this.nextId += 1;

    this.defects.push(defect);

    return {
      isNewDefect: true,
      distanceFromKnownPosition: 0,
      defect,
    };
  }

  getDefects() {
    return this.defects;
  }

  getDefect(id) {
    return this.defects.find(
      (defect) =>
        defect.id === id
    );
  }

  clear() {
    this.defects = [];
    this.nextId = 1;
  }
}

module.exports = DefectTracker;