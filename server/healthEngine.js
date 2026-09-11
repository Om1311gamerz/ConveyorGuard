function calculateHealth(data = {}) {
  const visualDamage =
    clamp(Number(data.visualDamage || 0));

  const vibration =
    clamp(Number(data.vibration || 0));

  const temperature =
    Number(data.temperature ?? 25);

  const misalignment =
    Math.max(
      0,
      Number(data.misalignment || 0)
    );

  const motorLoad =
    clamp(Number(data.motorLoad || 0));

  // ------------------------------------------
  // TEMPERATURE RISK
  // ------------------------------------------

  let temperatureRisk = 0;

  if (temperature > 30) {
    temperatureRisk =
      clamp(
        ((temperature - 30) / 40) *
        100
      );
  }

  // ------------------------------------------
  // ALIGNMENT RISK
  // ------------------------------------------

  const alignmentRisk =
    clamp(
      (misalignment / 10) *
      100
    );

  // ------------------------------------------
  // PROTOTYPE SENSOR FUSION
  // ------------------------------------------

  const damageScore =
    visualDamage * 0.35 +
    vibration * 0.25 +
    temperatureRisk * 0.15 +
    alignmentRisk * 0.15 +
    motorLoad * 0.10;

  const healthScore =
    clamp(
      100 - damageScore
    );

  let condition;

  if (healthScore >= 90) {
    condition = "HEALTHY";
  } else if (healthScore >= 75) {
    condition = "MINOR";
  } else if (healthScore >= 50) {
    condition = "MODERATE";
  } else if (healthScore >= 25) {
    condition = "SEVERE";
  } else {
    condition = "CRITICAL";
  }

  return {
    healthScore:
      Number(
        healthScore.toFixed(1)
      ),

    condition,

    damageScore:
      Number(
        damageScore.toFixed(1)
      ),

    factors: {
      visualDamage,

      vibration,

      temperature,

      temperatureRisk:
        Number(
          temperatureRisk.toFixed(1)
        ),

      misalignment,

      alignmentRisk:
        Number(
          alignmentRisk.toFixed(1)
        ),

      motorLoad,
    },
  };
}

function clamp(value) {
  return Math.max(
    0,
    Math.min(
      100,
      Number(value) || 0
    )
  );
}

module.exports = {
  calculateHealth,
};