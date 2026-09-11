const assert = require("node:assert/strict");
const test = require("node:test");

const MotorControlState = require("./motorControlState");

test("boots with an emergency-stop command", () => {
  const motor = new MotorControlState();
  assert.deepEqual(motor.command(), {
    sequence: 1,
    emergencyStop: true,
    run: false,
    speedPercent: 0,
  });
});

test("requires live hardware and an explicit reset/arm/start sequence", () => {
  const motor = new MotorControlState();
  assert.throws(() => motor.resetEmergencyStop(false), /firmware/);

  motor.resetEmergencyStop(true);
  assert.equal(motor.snapshot().armed, false);
  assert.throws(() => motor.start(true), /arm/);

  motor.arm(true);
  motor.setSpeed(35, true);
  assert.equal(motor.command().run, false);

  motor.start(true);
  assert.deepEqual(motor.command(), {
    sequence: motor.snapshot().sequence,
    emergencyStop: false,
    run: true,
    speedPercent: 35,
  });
});

test("stop and emergency stop always return a zero-speed command", () => {
  const motor = new MotorControlState();
  motor.resetEmergencyStop(true);
  motor.arm(true);
  motor.setSpeed(150, true);
  motor.start(true);
  assert.equal(motor.command().speedPercent, 100);

  motor.stop();
  assert.equal(motor.snapshot().armed, false);
  assert.equal(motor.command().speedPercent, 0);

  motor.engageEmergencyStop();
  assert.equal(motor.command().emergencyStop, true);
  assert.equal(motor.command().run, false);
});
