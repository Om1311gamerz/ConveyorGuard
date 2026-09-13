const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const { createApp } = require("./app");
const { defaults } = require("./config");

async function fixture(t, dbPath = ":memory:") {
  const system = createApp({ dbPath });
  const server = system.app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); system.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, method = "GET", body, headers = {}) {
    const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  return { ...system, request };
}

test("boot has no fabricated health, vision or hardware state; unsafe controls stay disabled", async t => {
  const { request } = await fixture(t);
  const { data } = await request("/api/beltguard/status");
  assert.equal(data.operationMode, "HARDWARE");
  assert.equal(data.sensor, null);
  assert.equal(data.health.healthScore, null);
  assert.equal(data.vision.connected, false);
  assert.equal(data.hardware.connected, false);
  assert.equal((await request("/api/motor/start", "POST", {})).status, 403);
  assert.equal((await request("/api/sensor-data", "DELETE")).status, 403);
  assert.equal((await request("/api/vision/defects", "DELETE")).status, 403);
  assert.equal((await request("/api/status", "GET", undefined, { Origin: "https://untrusted.example" })).status, 403);
});

test("invalid inputs never insert rows, and zero-valued aliases remain zero", async t => {
  const { request, store } = await fixture(t);
  for (const payload of [{}, [], { temperature: "hot" }, { vibration: true }, { motorCurrent: -1 }, { source: "SIMULATOR", temperature: 25 }]) assert.equal((await request("/api/sensor-data", "POST", payload)).status, 400);
  assert.equal(store.db.prepare("SELECT COUNT(*) n FROM sensor_readings").get().n, 0);
  const result = await request("/api/sensor-data", "POST", { source: "ESP32", temperature: 25, motor_current: 0, motorCurrent: 50, belt_speed: 0, beltSpeed: 5 });
  assert.equal(result.status, 200);
  assert.equal(result.data.reading.motor_current, 0);
  assert.equal(result.data.reading.belt_speed, 0);
  assert.equal(result.data.health.condition, "PARTIAL");
  assert.equal((await request("/api/sensor-data?limit=1001")).status, 400);
  assert.equal((await request("/api/sensor-data?from=bad")).status, 400);
  assert.equal((await request("/api/sensor-data?source=unrecognized")).status, 400);
  assert.equal((await request("/api/config", "PUT", { thresholds: null })).status, 400);
  assert.equal((await request("/api/config", "PUT", { thresholds: { temperatureCritical: 30 } })).status, 400);
});

test("NORMAL -> WARNING -> CRITICAL -> recovery stores deduplicated alert events with source isolation", async t => {
  const { request } = await fixture(t);
  await request("/api/demo", "POST", { enabled: true, mode: "NORMAL" });
  const normal = (await request("/api/beltguard/status")).data;
  assert.equal(normal.health.condition, "NORMAL");
  assert.equal(normal.alerts.length, 0);
  await request("/api/demo", "POST", { enabled: true, mode: "WARNING" });
  const warning = (await request("/api/beltguard/status")).data;
  assert.equal(warning.health.condition, "WARNING");
  assert.ok(warning.health.healthScore < normal.health.healthScore);
  const count = (await request("/api/alerts?source=SIMULATOR")).data.length;
  await request("/api/demo", "POST", { enabled: true, mode: "WARNING" });
  assert.equal((await request("/api/alerts?source=SIMULATOR")).data.length, count);
  await request("/api/demo", "POST", { enabled: true, mode: "CRITICAL" });
  const critical = (await request("/api/beltguard/status")).data;
  assert.equal(critical.health.condition, "CRITICAL");
  assert.ok(critical.health.healthScore < warning.health.healthScore);
  assert.ok(critical.health.faults.some(f => f.faultType === "POSSIBLE_JAM"));
  assert.equal((await request("/api/sensor-data/latest?source=ESP32")).data, null);
  await request("/api/demo", "POST", { enabled: true, mode: "NORMAL" });
  assert.equal((await request("/api/alerts?source=SIMULATOR&status=ACTIVE")).data.length, 0);
  const report = (await request("/api/reports/summary?source=SIMULATOR")).data;
  assert.equal(report.summary.totalReadings, 5);
  assert.equal(report.operatingModes.length, 3);
  const event = (await request("/api/alerts?source=SIMULATOR")).data[0];
  assert.equal(event.status, "RESOLVED");
  assert.equal((await request(`/api/alerts/${event.id}/acknowledge`, "POST", {})).status, 200);
  assert.ok((await request("/api/alerts?source=SIMULATOR")).data[0].acknowledged_at);
});

test("configuration and historical rows survive additive migration and restart", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "conveyorguard-test-"));
  const filename = path.join(directory, "history.db");
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const old = new Database(filename);
  old.exec("CREATE TABLE sensor_readings(id INTEGER PRIMARY KEY AUTOINCREMENT,timestamp TEXT DEFAULT CURRENT_TIMESTAMP,vibration REAL,temperature REAL,motor_current REAL,alignment REAL,rpm REAL,belt_speed REAL); INSERT INTO sensor_readings(temperature) VALUES(33);");
  old.close();
  const first = createApp({ dbPath: filename });
  first.store.saveConfig({ thresholds: { ...defaults.thresholds, temperatureWarning: 45, temperatureCritical: 55 } });
  first.store.ingest(require("./validation").sensor({ source: "ESP32", temperature: 60 }));
  first.close();
  const second = createApp({ dbPath: filename });
  assert.equal(second.store.config.thresholds.temperatureWarning, 45);
  assert.equal(second.store.history().length, 2);
  assert.equal(second.store.history()[1].source, "UNKNOWN");
  assert.equal(second.store.history()[1].temperature, 33);
  assert.equal(second.store.alerts().length, 1);
  second.close();
});

test("hardware diagnostics do not treat raw gravity, floating current or uncalibrated geometry as health readings", async t => {
  const { request } = await fixture(t);
  const measurement = { type: "measurement", time_ms: 100, adxl345_ok: true, accel_x: 0, accel_y: 0, accel_z: 9.81, vibration_magnitude: 9.81, mlx90614_ok: true, object_temp: 25, ina219_ok: true, current_ma: 3000, left_tof_ok: true, left_tof_mm: 100, right_tof_ok: true, right_tof_mm: 110, encoder_count: 2400, encoder_rpm: 60 };
  const result = await request("/api/hardware/serial", "POST", measurement);
  assert.equal(result.status, 200);
  assert.equal(result.data.motorCommand.run, false);
  const reading = (await request("/api/sensor-data/latest?source=ESP32")).data;
  assert.equal(reading.vibration, null);
  assert.equal(reading.motor_current, null);
  assert.equal(reading.alignment, null);
  assert.equal(reading.belt_speed, null);
  assert.equal(reading.temperature, 25);
  assert.equal((await request("/api/belt/status?source=ESP32")).data.positionValid, false);
});

test("vision persists actual detector metadata without inventing belt positions or contaminating simulation", async t => {
  const { request } = await fixture(t);
  const payload = { source: "FILE", type: "crack", confidence: 76, severity: 65, boundingBox: [1, 2, 100, 120], beltPosition: null, cycle: null, model: "test-fixture" };
  assert.equal((await request("/api/vision/detection", "POST", { ...payload, confidence: 101 })).status, 400);
  const result = await request("/api/vision/detection", "POST", payload);
  assert.equal(result.status, 200);
  assert.equal(result.data.positionTracked, false);
  assert.equal(result.data.vision.beltPosition, null);
  assert.deepEqual((await request("/api/vision/detections")).data[0].boundingBox, payload.boundingBox);
  await request("/api/demo", "POST", { enabled: true, mode: "NORMAL" });
  assert.equal((await request("/api/beltguard/status")).data.health.faults.length, 0);
});

test("file inference cannot clear a live camera fault, and sensor age is explicit", async t => {
  const { request, store } = await fixture(t);
  await request("/api/sensor-data", "POST", { source: "ESP32", temperature: 25 });
  await request("/api/vision/detection", "POST", { source: "CAMERA", type: "crack", confidence: 76, severity: 65 });
  await request("/api/vision/clear", "POST", { source: "FILE" });
  assert.ok((await request("/api/health/latest?source=ESP32")).data.faults.some(f => f.faultType === "BELT_JOINT_DAMAGE"));
  store.db.prepare("UPDATE sensor_readings SET timestamp=?").run(new Date(Date.now() - 6000).toISOString());
  assert.equal((await request("/api/health/latest?source=ESP32")).data.stale, true);
});

test("calibrated positions persist, but ESP32 reboot starts a new tracking session", async t => {
  const { request } = await fixture(t);
  await request("/api/config", "PUT", { hardware: { geometryCalibrated: true } });
  const measurement = { type: "measurement", source: "ESP32", time_ms: 1000, encoder_count: 2400, encoder_rpm: 60, mlx90614_ok: true, object_temp: 25 };
  await request("/api/hardware/serial", "POST", measurement);
  const detection = { source: "CAMERA", positionSource: "ESP32", type: "crack", confidence: 76, severity: 65, beltPosition: 0.15, cycle: 0 };
  assert.equal((await request("/api/vision/detection", "POST", detection)).data.positionTracked, true);
  await request("/api/hardware/serial", "POST", { type: "startup", source: "ESP32" });
  assert.equal((await request("/api/motor/status")).data.firmwareCompatible, false);
  assert.equal((await request("/api/belt/status?source=ESP32")).data.positionValid, false);
  await request("/api/hardware/serial", "POST", measurement);
  const result = await request("/api/vision/detection", "POST", detection);
  assert.equal(result.data.isNewDefect, true);
  assert.equal((await request("/api/vision/defects")).data.length, 2);
  assert.equal((await request("/api/hardware/serial", "POST", { ...measurement, source: "SIMULATOR" })).status, 400);
});
