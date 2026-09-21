const express = require("express");
const cors = require("cors");
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");
const Store = require("./store");
const BeltTracker = require("./beltTracker");
const DefectTracker = require("./defectTracker");
const HardwareState = require("./hardwareState");
const HardwareAdapter = require("./hardwareAdapter");
const MotorControlState = require("./motorControlState");
const { calculateHealth } = require("./healthEngine");
const { generateDemo } = require("./demo");
const v = require("./validation");

function createApp(options = {}) {
  const app = express();
  const store = new Store(options.dbPath);
  const hardwareState = new HardwareState();
  const adapter = new HardwareAdapter();
  const motorControl = new MotorControlState();
  const allowMotorControl = options.allowMotorControl ?? process.env.ALLOW_MOTOR_CONTROL === "true";
  const allowHistoryDelete = options.allowHistoryDelete ?? process.env.ALLOW_HISTORY_DELETE === "true";
  let operationMode = "HARDWARE", demoMode = "NORMAL", demoTick = 0, demoTimer = null;
  let lastStoredHardwareAt = 0, lastDemoAt = null;
  const makeBelt = source => { const belt = new BeltTracker(store.config.hardware); belt.source = source; return belt; };
  let belts = { ESP32: makeBelt("ESP32"), SIMULATOR: makeBelt("SIMULATOR"), UNKNOWN: makeBelt("UNKNOWN") };
  const defects = new DefectTracker(store.config.hardware);
  const savedDefects = store.db.prepare("SELECT json FROM defect_state WHERE id=1").get();
  if (savedDefects) {
    defects.defects = JSON.parse(savedDefects.json);
    defects.nextId = Math.max(0, ...defects.defects.map(d => Number(d.id.slice(1)))) + 1;
  }
  const emptyVision = { connected: false, defectDetected: false, source: null, timestamp: null, confidence: null, severity: null, beltPosition: null, cycle: null };
  const visionBySource = {};
  let latestCameraFrame = null;
  let cameraWorker = null;
  let cameraWorkerSource = null;
  let cameraWorkerError = null;
  const allowedOrigin = origin => !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const host = req.headers.host?.split(":")[0];
    if (!["localhost", "127.0.0.1", "[", undefined].includes(host)) return res.status(403).json({ error: "Loopback host required" });
    if (!allowedOrigin(req.headers.origin)) return res.status(403).json({ error: "Local dashboard origin required" });
    next();
  });
  app.use(cors({ origin: (origin, callback) => callback(null, allowedOrigin(origin)) }));
  app.use(express.json({ limit: "64kb" }));

  const cameraRoot = path.resolve(__dirname, "..");
  const cameraScript = path.join(cameraRoot, "vision", "camera_test.py");
  const venvPython = process.platform === "win32"
    ? path.join(cameraRoot, ".venv", "Scripts", "python.exe")
    : path.join(cameraRoot, ".venv", "bin", "python");
  function workerStatus() {
    return { running: cameraWorker !== null, source: cameraWorkerSource, error: cameraWorkerError };
  }

  function selectedSource(req) {
    const source = req.query.source ?? (operationMode === "SIMULATION" ? "SIMULATOR" : "ESP32");
    if (!["ESP32", "SIMULATOR", "UNKNOWN"].includes(source)) throw new TypeError("Invalid sensor source");
    return source;
  }
  function visionSnapshot(source) {
    const latestVision = source ? visionBySource[source] ?? emptyVision : Object.values(visionBySource).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0] ?? emptyVision;
    const age = latestVision.timestamp ? Date.now() - Date.parse(latestVision.timestamp) : null;
    return { ...latestVision, connected: age !== null && age <= store.config.freshness.visionMs, sampleAgeMs: age };
  }
  function currentHardware() {
    const hardware = hardwareState.snapshot();
    if (!hardware.connected && motorControl.running) motorControl.engageEmergencyStop("ESP32 heartbeat lost");
    return hardware;
  }
  function motorStatus() {
    const hardware = currentHardware(), m = hardware.measurement;
    return {
      ...motorControl.snapshot(), enabled: allowMotorControl,
      hardwareConnected: hardware.connected,
      firmwareCompatible: hardware.connected && typeof m?.motor_estop_latched === "boolean",
      firmware: m ? {
        emergencyStop: m.motor_estop_latched, commandFresh: m.motor_command_fresh,
        runRequested: m.motor_run_requested, relayOn: m.motor_relay_on,
        targetPercent: m.motor_target_percent, pwmPercent: m.motor_pwm_percent,
        commandSequence: m.motor_command_sequence, encoderRpm: m.encoder_rpm, currentMa: m.current_ma,
      } : null,
    };
  }
  function beltSnapshot(source) {
    const belt = belts[source].getStatus();
    if (source === "ESP32" && !currentHardware().connected) {
      belt.connected = false; belt.positionValid = false;
    }
    if (source === "ESP32" && !store.config.hardware.geometryCalibrated) {
      return { ...belt, positionValid: false, geometryCalibrated: false, beltPositionMeters: null, distanceMeters: null, beltSpeedMetersPerSecond: null };
    }
    return { ...belt, geometryCalibrated: source === "SIMULATOR" || store.config.hardware.geometryCalibrated };
  }
  function latestHealth(source) {
    const reading = store.latest({ source, conveyorId: "CB-01" });
    if (!reading) return { healthScore: null, condition: "UNKNOWN", status: "UNKNOWN", faults: [], dataQuality: { missing: ["vibration", "temperature", "motor_current", "alignment", "belt_speed"] }, method: "PROTOTYPE_HEURISTIC", source, stale: true };
    const age = Date.now() - Date.parse(reading.timestamp);
    const health = calculateHealth(reading, store.config.thresholds, source === "ESP32" ? visionSnapshot("CAMERA") : null);
    return { ...health, source, timestamp: reading.timestamp, sampleAgeMs: age, stale: age > store.config.freshness.sensorMs };
  }
  function snapshot(req) {
    const source = selectedSource(req), hardware = currentHardware();
    return {
      name: "ConveyorGuard", timestamp: new Date().toISOString(), backend: true, database: true,
      operationMode, demoMode, source, config: store.config,
      hardware, motor: motorStatus(), belt: beltSnapshot(source), health: latestHealth(source),
      vision: visionSnapshot(), sensor: store.latest({ source, conveyorId: "CB-01" }),
      defects: defects.getDefects(), alerts: [...store.alerts({ source, conveyorId: "CB-01", status: "ACTIVE", limit: 100 }), ...(source === "ESP32" ? store.alerts({ source: "CAMERA", conveyorId: "CB-01", status: "ACTIVE", limit: 100 }) : [])],
      hardwareConnected: hardware.connected, visionConnected: visionSnapshot("CAMERA").connected,
    };
  }
  function ingest(input) {
    const reading = v.sensor(input);
    if (reading.source === "SIMULATOR" && operationMode !== "SIMULATION") throw new TypeError("Enable SIMULATION mode before ingesting simulator data");
    return store.ingest(reading, reading.source === "ESP32" ? visionSnapshot("CAMERA") : null);
  }
  function tickDemo() {
    demoTick += 1;
    const packet = generateDemo(demoMode, store.config.thresholds, demoTick);
    const now = Date.now(), elapsed = lastDemoAt === null ? 0 : Math.max(0, now - lastDemoAt) / 1000;
    lastDemoAt = now;
    const revolutions = packet.beltSpeed * elapsed / (Math.PI * store.config.hardware.rollerDiameterMeters);
    const belt = belts.SIMULATOR;
    belt.totalPulses += Math.round(revolutions * store.config.hardware.encoderPPR);
    belt.totalDistance += packet.beltSpeed * elapsed;
    belt.rpm = packet.beltSpeed / (Math.PI * store.config.hardware.rollerDiameterMeters) * 60;
    belt.beltCyclesPerMinute = packet.beltSpeed * 60 / store.config.hardware.beltLengthMeters;
    belt.lastMeasurementAt = now; belt.positionValid = true;
    packet.beltPosition = belts.SIMULATOR.getStatus().beltPositionMeters;
    packet.rpm = packet.beltSpeed / (Math.PI * store.config.hardware.rollerDiameterMeters) * 60;
    ingest(packet);
  }

  app.get("/", (req, res) => res.json({ name: "ConveyorGuard", backend: "running", version: "0.1.0" }));
  app.get("/api/status", (req, res) => {
    store.db.prepare("SELECT 1").get();
    res.json({ name: "ConveyorGuard", backend: true, database: true, operationMode, demoMode, hardwareConnected: currentHardware().connected, visionConnected: visionSnapshot("CAMERA").connected, timestamp: new Date().toISOString() });
  });
  app.get("/api/beltguard/status", (req, res) => res.json(snapshot(req)));
  app.get("/api/config", (req, res) => res.json(store.config));
  app.put("/api/config", (req, res) => {
    v.object(req.body);
    for (const key of Object.keys(req.body)) if (!["thresholds", "hardware"].includes(key)) throw new TypeError("Unknown configuration section: " + key);
    for (const key of ["thresholds", "hardware"]) if (req.body[key] !== undefined) v.object(req.body[key]);
    const merged = { thresholds: { ...store.config.thresholds, ...req.body.thresholds }, hardware: { ...store.config.hardware, ...req.body.hardware } };
    const oldHardware = JSON.stringify(store.config.hardware);
    const result = store.saveConfig(merged);
    if (oldHardware !== JSON.stringify(result.hardware)) {
      belts = { ESP32: makeBelt("ESP32"), SIMULATOR: makeBelt("SIMULATOR"), UNKNOWN: makeBelt("UNKNOWN") };
      adapter.reset();
      defects.beltLengthMeters = result.hardware.beltLengthMeters;
      defects.positionToleranceMeters = result.hardware.positionToleranceMeters;
      defects.trackingSession = require("node:crypto").randomUUID();
    }
    res.json(result);
  });
  app.post("/api/demo", (req, res) => {
    v.object(req.body);
    if (typeof req.body.enabled !== "boolean") throw new TypeError("enabled must be boolean");
    const mode = req.body.mode ?? demoMode;
    if (!["NORMAL", "WARNING", "CRITICAL"].includes(mode)) throw new TypeError("mode must be NORMAL, WARNING or CRITICAL");
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = null;
    motorControl.engageEmergencyStop("Monitoring mode changed; motor remains stopped");
    operationMode = req.body.enabled ? "SIMULATION" : "HARDWARE"; demoMode = mode;
    if (req.body.enabled) { tickDemo(); demoTimer = setInterval(() => { try { tickDemo(); } catch (error) { console.error("Demo ingest failed:", error.message); } }, 1500); demoTimer.unref(); }
    else { store.reconcileAlerts("SIMULATOR", "CB-01", []); lastDemoAt = null; }
    res.json({ operationMode, demoMode, source: operationMode === "SIMULATION" ? "SIMULATOR" : "ESP32" });
  });

  app.post("/api/hardware/serial", (req, res) => {
    v.object(req.body);
    if (req.body.source !== undefined && req.body.source !== "ESP32") throw new TypeError("Serial packets must originate from ESP32");
    if (req.body.conveyorId !== undefined && req.body.conveyorId !== "CB-01") throw new TypeError("This serial controller is configured for CB-01");
    const rebooted = req.body.type === "startup" || (typeof req.body.time_ms === "number" && hardwareState.measurement?.time_ms !== null && req.body.time_ms < hardwareState.measurement?.time_ms);
    const hardware = hardwareState.update(req.body);
    if (rebooted) { adapter.reset(); belts.ESP32 = makeBelt("ESP32"); lastStoredHardwareAt = 0; defects.trackingSession = require("node:crypto").randomUUID(); motorControl.engageEmergencyStop("ESP32 startup/reconnect detected"); }
    if (req.body.type === "measurement") {
      belts.ESP32.updateEncoder(hardware.measurement);
      const packet = adapter.normalize(hardware.measurement, store.config, beltSnapshot("ESP32"));
      if (hardware.measurement.motor_estop_latched === true && motorControl.running) motorControl.engageEmergencyStop("ESP32 safety latch stopped the motor");
      if (Date.now() - lastStoredHardwareAt >= 1000 && [packet.vibration, packet.temperature, packet.motorCurrent, packet.alignment, packet.beltSpeed].some(value => value !== null)) {
        ingest(packet); lastStoredHardwareAt = Date.now();
      }
    }
    res.json({ success: true, connected: hardware.connected, sampleAgeMs: hardware.sampleAgeMs, motorCommand: motorControl.command() });
  });
  app.get("/api/hardware/latest", (req, res) => res.json(currentHardware()));
  app.get("/api/motor/status", (req, res) => res.json(motorStatus()));
  app.post("/api/motor/emergency-stop", (req, res) => { motorControl.engageEmergencyStop("Website emergency stop pressed"); res.json({ success: true, motor: motorStatus() }); });
  app.post("/api/motor/stop", (req, res) => { motorControl.stop("Website stop pressed"); res.json({ success: true, motor: motorStatus() }); });
  for (const [route, action] of [
    ["reset", () => motorControl.resetEmergencyStop(motorStatus().firmwareCompatible)],
    ["arm", () => motorControl.arm(motorStatus().firmwareCompatible)],
    ["speed", req => motorControl.setSpeed(v.number(req.body.speedPercent, "speedPercent", 0, 100, false), motorStatus().firmwareCompatible)],
    ["start", () => motorControl.start(motorStatus().firmwareCompatible)],
  ]) {
    app.post("/api/motor/" + route, (req, res) => {
      if (!allowMotorControl || operationMode === "SIMULATION") return res.status(403).json({ error: "Physical motor control is disabled", motor: motorStatus() });
      try { action(req); res.json({ success: true, motor: motorStatus() }); }
      catch (error) { res.status(error instanceof TypeError ? 400 : 409).json({ error: error.message, motor: motorStatus() }); }
    });
  }

  app.post("/api/sensor-data", (req, res) => res.json(ingest(req.body)));
  app.get("/api/sensor-data/latest", (req, res) => res.json(store.latest({ ...req.query, source: selectedSource(req) })));
  app.get("/api/sensor-data", (req, res) => res.json(store.history(req.query)));
  app.delete("/api/sensor-data", (req, res) => {
    if (!allowHistoryDelete || req.query.confirm !== "DELETE") return res.status(403).json({ error: "History deletion disabled; export and back up data before explicitly enabling it" });
    const f = v.filters(req.query);
    store.db.prepare("DELETE FROM sensor_readings" + f.where).run(...f.params);
    res.json({ success: true });
  });
  app.get("/api/alerts", (req, res) => res.json(store.alerts(req.query)));
  app.post("/api/alerts/:id/acknowledge", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new TypeError("Invalid alert id");
    const result = store.db.prepare("UPDATE alert_events SET acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=?").run(new Date().toISOString(), id);
    if (!result.changes) return res.status(404).json({ error: "Alert not found" });
    res.json({ success: true });
  });
  app.post("/api/belt/pulses", (req, res) => {
    v.object(req.body);
    const source = req.body.source ?? "UNKNOWN";
    if (!belts[source]) throw new TypeError("Invalid pulse source");
    if (source === "SIMULATOR" && operationMode !== "SIMULATION") throw new TypeError("Enable SIMULATION before posting simulator pulses");
    const pulses = v.number(req.body.pulses, "pulses", 1, 10000000, false);
    if (!Number.isSafeInteger(pulses)) throw new TypeError("pulses must be an integer");
    belts[source].addPulses(pulses);
    res.json(beltSnapshot(source));
  });
  app.get("/api/belt/status", (req, res) => res.json(beltSnapshot(selectedSource(req))));
  app.post("/api/health", (req, res) => {
    const reading = v.sensor(req.body);
    res.json({ ...calculateHealth(reading, store.config.thresholds), source: reading.source, persisted: false });
  });
  app.get("/api/health/latest", (req, res) => res.json(latestHealth(selectedSource(req))));
  app.get("/api/reports/summary", (req, res) => res.json(store.summary(req.query)));

  app.post("/api/vision/detection", (req, res) => {
    const body = v.object(req.body);
    const type = v.text(body.type, "type");
    const confidence = v.number(body.confidence, "confidence (%)", 0, 100, false);
    const severity = v.number(body.severity, "severity (heuristic /100)", 0, 100, false);
    const source = body.source ?? "UNKNOWN";
    if (!["CAMERA", "FILE", "UNKNOWN"].includes(source)) throw new TypeError("Vision source must be CAMERA, FILE or UNKNOWN");
    const boundingBox = body.boundingBox ?? null;
    if (boundingBox !== null && (!Array.isArray(boundingBox) || boundingBox.length !== 4 || boundingBox.some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0) || boundingBox[2] <= boundingBox[0] || boundingBox[3] <= boundingBox[1])) throw new TypeError("boundingBox must contain ordered positive pixel xyxy coordinates");
    const position = v.number(body.beltPosition, "beltPosition", 0, store.config.hardware.beltLengthMeters);
    const cycle = v.number(body.cycle, "cycle", -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    if (cycle !== null && !Number.isSafeInteger(cycle)) throw new TypeError("cycle must be an integer");
    const belt = beltSnapshot("ESP32");
    const tracked = source === "CAMERA" && body.positionSource === "ESP32" && belt.positionValid && position !== null && cycle !== null;
    let result = { isNewDefect: false, defect: null, positionTracked: tracked };
    if (tracked) {
      result = { ...defects.recordDetection({ type, confidence, severity, beltPosition: position, cycle }), positionTracked: true };
      store.db.prepare("INSERT INTO defect_state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(defects.getDefects()));
    }
    const latestVision = {
      connected: true, defectDetected: true, type, confidence, severity, source,
      boundingBox, timestamp: new Date().toISOString(), model: typeof body.model === "string" ? body.model.slice(0, 128) : null,
      beltPosition: tracked ? position : null, cycle: tracked ? cycle : null,
      positionSource: tracked ? "ESP32" : null, defectId: result.defect?.id ?? null, timesSeen: result.defect?.timesSeen ?? null,
    };
    visionBySource[source] = latestVision;
    store.db.prepare("INSERT INTO vision_detections(timestamp,json) VALUES(?,?)").run(latestVision.timestamp, JSON.stringify(latestVision));
    store.reconcileAlerts(source, "CB-01", [{ faultType: "BELT_JOINT_DAMAGE", severity: severity >= 70 ? "CRITICAL" : "WARNING", contributingSignals: ["vision"], explanation: "YOLO reports " + type + " from " + source + "; visual severity is heuristic.", recommendation: "Review the annotated result and inspect the belt safely." }]);
    res.json({ ...result, vision: latestVision });
  });
  app.post("/api/vision/clear", (req, res) => {
    const body = v.object(req.body), source = body.source ?? "UNKNOWN";
    if (!["CAMERA", "FILE", "UNKNOWN"].includes(source)) throw new TypeError("Invalid vision source");
    visionBySource[source] = { connected: true, defectDetected: false, source, timestamp: new Date().toISOString(), confidence: null, severity: 0, beltPosition: null, cycle: null, boundingBox: null };
    store.reconcileAlerts(source, "CB-01", []);
    res.json({ success: true });
  });
  app.get("/api/vision/latest", (req, res) => res.json(visionSnapshot()));
  app.post("/api/vision/frame", express.raw({ type: "image/jpeg", limit: "2mb" }), (req, res) => {
    const frame = req.body;
    if (!Buffer.isBuffer(frame) || frame.length < 4 || frame[0] !== 0xff || frame[1] !== 0xd8 || frame[frame.length - 2] !== 0xff || frame[frame.length - 1] !== 0xd9) {
      return res.status(400).json({ error: "A JPEG camera frame is required" });
    }
    latestCameraFrame = { bytes: frame, receivedAt: Date.now() };
    res.sendStatus(204);
  });
  app.get("/api/vision/frame", (req, res) => {
    if (!latestCameraFrame || Date.now() - latestCameraFrame.receivedAt > 2000) return res.status(204).end();
    res.set("Cache-Control", "no-store");
    res.type("jpeg").send(latestCameraFrame.bytes);
  });
  app.get("/api/vision/worker", (req, res) => res.json(workerStatus()));
  app.post("/api/vision/worker/start", (req, res) => {
    const source = req.body?.source ?? 0;
    if (!Number.isInteger(source) || source < 0 || source > 9) return res.status(400).json({ error: "Camera index must be an integer from 0 to 9" });
    if (cameraWorker) return res.status(409).json({ error: "A YOLO camera worker is already running" });
    if (!existsSync(venvPython)) return res.status(503).json({ error: "Python environment not found. Install the vision dependencies in the project .venv first." });
    cameraWorkerError = null;
    cameraWorkerSource = source;
    latestCameraFrame = null;
    const apiBase = `http://127.0.0.1:${req.socket.localPort}`;
    const child = spawn(venvPython, [cameraScript, "--source", String(source), "--api-url", apiBase, "--headless"], {
      cwd: cameraRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    cameraWorker = child;
    child.stdout.on("data", () => {});
    child.stderr.on("data", data => { cameraWorkerError = String(data).trim().slice(-500); });
    child.on("error", error => {
      if (cameraWorker === child) {
        cameraWorkerError = error.message;
        cameraWorker = null;
        cameraWorkerSource = null;
        latestCameraFrame = null;
      }
    });
    child.on("exit", (code, signal) => {
      if (cameraWorker !== child) return;
      cameraWorker = null;
      cameraWorkerSource = null;
      latestCameraFrame = null;
      if (code && !cameraWorkerError) cameraWorkerError = `YOLO camera worker exited with code ${code}${signal ? ` (${signal})` : ""}.`;
    });
    res.status(202).json(workerStatus());
  });
  app.post("/api/vision/worker/stop", (req, res) => {
    if (cameraWorker) cameraWorker.kill("SIGTERM");
    cameraWorker = null;
    cameraWorkerSource = null;
    cameraWorkerError = null;
    latestCameraFrame = null;
    res.json(workerStatus());
  });
  app.get("/api/vision/detections", (req, res) => res.json(store.db.prepare("SELECT json FROM vision_detections ORDER BY id DESC LIMIT ?").all(v.limit(req.query)).map(r => JSON.parse(r.json))));
  app.get("/api/vision/defects", (req, res) => res.json(defects.getDefects()));
  app.get("/api/vision/defects/:id", (req, res) => {
    const defect = defects.getDefect(req.params.id);
    if (!defect) return res.status(404).json({ error: "Defect not found" });
    res.json(defect);
  });
  app.delete("/api/vision/defects", (req, res) => {
    if (!allowHistoryDelete || req.query.confirm !== "DELETE") return res.status(403).json({ error: "Defect-history deletion disabled" });
    defects.clear(); store.db.prepare("DELETE FROM defect_state").run();
    res.json({ success: true });
  });
  app.use((req, res) => res.status(404).json({ error: "API route not found" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof TypeError || error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500;
    if (status === 500) console.error("API error:", error.message);
    res.status(status).json({ success: false, error: status === 500 ? "Internal server error" : error.message });
  });
  const watchdog = setInterval(() => { currentHardware(); }, 100); watchdog.unref();
  function close() {
    if (demoTimer) clearInterval(demoTimer);
    clearInterval(watchdog);
    if (cameraWorker) cameraWorker.kill("SIGTERM");
    cameraWorker = null;
    latestCameraFrame = null;
    motorControl.engageEmergencyStop("Backend shutting down");
    store.close();
  }
  return { app, store, close };
}
module.exports = { createApp };
