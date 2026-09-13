const path = require("node:path");
const fs = require("node:fs");
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const { createApp } = require("./app");

const port = Number(process.env.PORT || 5000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const system = createApp();
const server = system.app.listen(port, "127.0.0.1", () => {
  console.log("ConveyorGuard API: http://127.0.0.1:" + port);
  console.log("Monitoring starts in HARDWARE mode; physical motor control " + (process.env.ALLOW_MOTOR_CONTROL === "true" ? "enabled by local configuration" : "disabled"));
});
server.on("error", error => { console.error("API startup failed:", error.message); system.close(); process.exitCode = 1; });
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => { system.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 1500).unref();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
