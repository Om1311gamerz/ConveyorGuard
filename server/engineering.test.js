const test = require("node:test");
const assert = require("node:assert/strict");
const HardwareState = require("./hardwareState");
const HardwareAdapter = require("./hardwareAdapter");
const BeltTracker = require("./beltTracker");
const DefectTracker = require("./defectTracker");
const { defaults } = require("./config");

test("hardware and encoder freshness expire without inventing a live reading", () => {
  const hardware = new HardwareState();
  hardware.update({ type: "measurement", object_temp: true }, 0);
  assert.equal(hardware.snapshot(0).measurement.object_temp, null);
  assert.equal(hardware.snapshot(600).connected, true);
  assert.equal(hardware.snapshot(601).connected, false);
  const belt = new BeltTracker(defaults.hardware);
  belt.updateEncoder({ encoder_count: 2400, encoder_rpm: 60 }, 0);
  assert.equal(belt.getStatus(5001).positionValid, false);
  assert.equal(belt.getStatus(5001).rollerRPM, 0);
});

test("dynamic acceleration removes constant gravity, waits for a full window and resets on invalid samples", () => {
  const adapter = new HardwareAdapter();
  let packet;
  for (let i = 0; i < 20; i++) {
    packet = adapter.normalize({ time_ms: i * 100, adxl345_ok: true, accel_x: i % 2 ? 2 : -2, accel_y: 0, accel_z: 9.81 }, defaults, null);
    if (i < 19) assert.equal(packet.vibration, null);
  }
  assert.ok(Math.abs(packet.vibration - 2) < 1e-10);
  packet = adapter.normalize({ time_ms: 2000, adxl345_ok: false }, defaults, null);
  assert.equal(packet.vibration, null);
  packet = adapter.normalize({ time_ms: 2100, adxl345_ok: true, accel_x: 0, accel_y: 0, accel_z: 9.81 }, defaults, null);
  assert.equal(packet.vibration, null);
});

test("signed quadrature count uses x4 resolution and wraps reverse position around the loop", () => {
  const belt = new BeltTracker(defaults.hardware);
  belt.updateEncoder({ encoder_count: -2400, encoder_rpm: -60 }, 100);
  const status = belt.getStatus(100);
  assert.equal(status.rollerRPM, -60);
  assert.ok(Math.abs(status.beltPositionMeters - (2 - Math.PI * 0.05)) < 0.001);
  assert.equal(status.completedBeltCycles, -1);
  assert.ok(status.beltSpeedMetersPerSecond > 0);
});

test("the same class across the loop boundary is counted once per cycle and kept separate after a new origin", () => {
  const tracker = new DefectTracker(defaults.hardware);
  const first = tracker.recordDetection({ type: "crack", confidence: 60, severity: 65, beltPosition: 1.98, cycle: 0 });
  const match = tracker.recordDetection({ type: "crack", confidence: 70, severity: 66, beltPosition: 0.02, cycle: 0 });
  assert.equal(match.defect.id, first.defect.id);
  assert.equal(match.defect.timesSeen, 1);
  tracker.recordDetection({ type: "crack", confidence: 70, severity: 66, beltPosition: 0.02, cycle: 1 });
  assert.equal(match.defect.timesSeen, 2);
  tracker.trackingSession = "new-origin";
  assert.equal(tracker.recordDetection({ type: "crack", confidence: 70, severity: 66, beltPosition: 0.02, cycle: 1 }).isNewDefect, true);
});
