import { existsSync } from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const noBrowser = process.argv.includes("--no-browser");
const withHardware = process.argv.includes("--hardware");
const demo = process.argv.includes("--demo");
if (withHardware && demo) throw new Error("Choose hardware monitoring or the software demo, separately.");
const children = [];
let stopping = false;

function managedProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });

  children.push({ name, child });
  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(`\n${name} stopped unexpectedly (${signal || `exit ${code}`}).`);
    stopAll(1);
  });
  return child;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFreePort(firstPort, lastPort) {
  for (let port = firstPort; port <= lastPort; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free TCP port between ${firstPort} and ${lastPort}.`);
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(700) });
    return { reachable: true, ok: response.ok, status: response.status };
  } catch {
    return { reachable: false, ok: false, status: null };
  }
}

async function waitFor(url, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await probe(url);
    if (result.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready at ${url}.`);
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping ConveyorGuard...");

  for (const { child } of [...children].reverse()) {
    if (!child.killed) child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(exitCode), 800);
}

process.once("SIGINT", () => stopAll(0));
process.once("SIGTERM", () => stopAll(0));

async function main() {
  const serverEntry = join(projectRoot, "server", "index.js");
  const viteEntry = join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  const windowsBridge = join(projectRoot, "hardware", "read_esp32.ps1");
  const pythonBridge = join(projectRoot, "hardware", "read_esp32.py");

  if (!existsSync(serverEntry) || !existsSync(viteEntry)) {
    throw new Error(
      "Dependencies are missing. Run npm install in the project root and in the server folder once.",
    );
  }

  console.log("\nConveyorGuard — local website + API\n");

  const existingHardwareApi = await probe(
    "http://127.0.0.1:5000/api/hardware/latest",
  );
  const existingMotorApi = await probe(
    "http://127.0.0.1:5000/api/motor/status",
  );

  if (existingHardwareApi.ok && !existingMotorApi.ok) {
    throw new Error(
      "An older ConveyorGuard is already running on port 5000. Close its terminal window, then start ConveyorGuard again.",
    );
  }

  let backendPort;
  if (existingHardwareApi.ok && existingMotorApi.ok) {
    backendPort = 5000;
    console.log("Using the running ConveyorGuard API on port 5000.");
  } else {
    backendPort = await findFreePort(5000, 5099);
    if (backendPort !== 5000) {
      console.log(`Port 5000 is already in use; using API port ${backendPort}.`);
    }

    managedProcess("Backend", process.execPath, [serverEntry], {
      cwd: join(projectRoot, "server"),
      env: { ...process.env, PORT: String(backendPort) },
    });
    await waitFor(
      `http://127.0.0.1:${backendPort}/api/hardware/latest`,
      "ConveyorGuard API",
    );
  }

  const apiBase = `http://127.0.0.1:${backendPort}`;
  const statusResponse = await fetch(`${apiBase}/api/status`);
  const status = await statusResponse.json();
  if (status.name !== "ConveyorGuard") throw new Error("The existing API is an older version. Stop it before starting this version.");
  if (demo) {
    const response = await fetch(`${apiBase}/api/demo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true, mode: "NORMAL" }) });
    if (!response.ok) throw new Error("Could not enable the software demo.");
  }
  const frontendPort = await findFreePort(5173, 5273);
  managedProcess(
    "Website",
    process.execPath,
    [
      viteEntry,
      "--configLoader",
      "runner",
      "--host",
      "127.0.0.1",
      "--port",
      String(frontendPort),
      "--strictPort",
    ],
    { env: { ...process.env, VITE_API_URL: apiBase } },
  );

  const websiteUrl = `http://127.0.0.1:${frontendPort}/`;
  await waitFor(websiteUrl, "ConveyorGuard website");

  const hardwareEndpoint = `${apiBase}/api/hardware/serial`;
  if (withHardware && process.platform === "win32") {
    if (!existsSync(windowsBridge)) throw new Error("Windows ESP32 bridge is missing.");
    managedProcess(
      "ESP32 USB bridge",
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        windowsBridge,
        "-ApiUrl",
        hardwareEndpoint,
      ],
    );
  } else if (withHardware) {
    if (!existsSync(pythonBridge)) throw new Error("Python ESP32 bridge is missing.");
    managedProcess(
      "ESP32 USB bridge",
      "python3",
      [pythonBridge, "--api-url", hardwareEndpoint],
    );
  }

  console.log(`\nREADY: ${websiteUrl}`);
  console.log(withHardware ? "Explicit ESP32 serial watcher is running. Motor actuation is disabled unless separately configured." : demo ? "SIMULATION demo active. No serial device is opened." : "Software-only startup. Select a monitoring source in the dashboard.");
  console.log("Leave this window open; press Ctrl+C to stop the managed services.\n");

  if (!noBrowser) {
    if (process.platform === "win32") {
      const browser = spawn("explorer.exe", [websiteUrl], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      browser.unref();
    } else if (process.platform === "darwin") {
      const browser = spawn("open", [websiteUrl], { detached: true, stdio: "ignore" });
      browser.unref();
    }
  }

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(`\nStartup failed: ${error.message}`);
  stopAll(1);
});
