const API_URL =
  "http://localhost:5000/api/belt/pulses";

const PULSES_PER_UPDATE = 100;

const UPDATE_INTERVAL_MS = 500;


async function sendPulses() {
  try {
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            pulses:
              PULSES_PER_UPDATE,
          }),
      }
    );

  } catch {
    // Keep simulator quiet.
  }
}


console.log(
  "Encoder simulator running"
);

console.log(
  "Press Ctrl+C to stop"
);


setInterval(
  sendPulses,
  UPDATE_INTERVAL_MS
);
