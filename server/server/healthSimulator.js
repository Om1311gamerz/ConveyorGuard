const API_URL = "http://localhost:5000/api/health";

console.log("BeltGuard Health Simulator");
console.log("Sending simulated sensor data...");
console.log("Press Ctrl+C to stop.");

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

async function sendHealthData() {
  const payload = {
    visualDamage: Number(randomBetween(20, 70).toFixed(1)),
    vibration: Number(randomBetween(20, 75).toFixed(1)),
    temperature: Number(randomBetween(28, 45).toFixed(1)),
    misalignment: Number(randomBetween(0, 6).toFixed(1)),
    motorLoad: Number(randomBetween(20, 70).toFixed(1)),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.clear();

    console.log("===== BELTGUARD HEALTH =====");
    console.log("");
    console.log("Health Score:", data.healthScore);
    console.log("Condition:", data.condition);
    console.log("");
    console.log("Visual Damage:", payload.visualDamage);
    console.log("Vibration:", payload.vibration);
    console.log("Temperature:", payload.temperature, "°C");
    console.log("Misalignment:", payload.misalignment, "mm");
    console.log("Motor Load:", payload.motorLoad);
  } catch (error) {
    console.log("Cannot connect to health API.");
    console.log(error.message);
  }
}

setInterval(sendHealthData, 1000);