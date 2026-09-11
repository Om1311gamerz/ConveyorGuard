/*
  conveyor_sensor_test.ino

  ConveyorGuard sensor stream and guarded motor controller.

  SAFETY SCOPE:
    - Motor outputs initialize OFF and the emergency stop initializes latched.
    - A fresh command from the local USB bridge is required at least every
      750 ms. A lost heartbeat immediately removes PWM and relay power and
      latches the stop until the operator resets and starts again.
    - This software stop supplements, but never replaces, a hard-wired,
      latching emergency stop that removes motor power.
    - INA219 VIN+ and VIN- follow the supplied schematic and remain outside
      the motor-current path; those electrical readings are diagnostic only.

  Encoder resolution assumption:
    PULSES_PER_REVOLUTION is the number of rising edges/cycles on channel A.
    This sketch performs x4 quadrature decoding, so with a 600 PPR encoder:

      COUNTS_PER_REVOLUTION = 600 * 4 = 2400

    Verify this by turning the shaft exactly one revolution. If the label or
    vendor defines "600 PPR" as the already-decoded x4 count, change the two
    constants below to match the verified hardware.
*/

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADXL345_U.h>
#include <Adafruit_INA219.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_VL53L0X.h>
#include <esp_arduino_version.h>
#include <cmath>

// --------------------------- User configuration ---------------------------

#define OUTPUT_JSON true

constexpr uint32_t SERIAL_BAUD = 115200;
constexpr uint32_t MEASUREMENT_INTERVAL_MS = 100;  // Target 10 updates/s
constexpr uint32_t I2C_CLOCK_HZ = 100000;          // MLX90614-safe bus speed

constexpr uint8_t BUS1_SDA_PIN = 21;
constexpr uint8_t BUS1_SCL_PIN = 22;
constexpr uint8_t BUS2_SDA_PIN = 16;
constexpr uint8_t BUS2_SCL_PIN = 17;

constexpr uint8_t ENCODER_A_PIN = 32;  // Green wire; external 5k to 3.3 V
constexpr uint8_t ENCODER_B_PIN = 33;  // White wire; external 5k to 3.3 V

// Motor/relay wiring from the supplied Conveyor Belt Monitoring schematic.
constexpr uint8_t MOTOR_IN1_PIN = 18;  // Driver IN1, fixed forward direction
constexpr uint8_t MOTOR_IN2_PIN = 19;  // Driver IN2, fixed forward direction
constexpr uint8_t MOTOR_ENA_PIN = 25;  // Driver ENA (PWM)
constexpr uint8_t RELAY_PIN = 23;      // Relay module IN

// The pictured 5 V relay module is the common active-low type. If a 5 V-only
// bench test proves the relay turns ON when GPIO23 is HIGH, change this to
// false before connecting the 24 V motor supply.
constexpr bool RELAY_ACTIVE_LOW = true;

constexpr uint32_t MOTOR_COMMAND_TIMEOUT_MS = 750;
constexpr uint32_t MOTOR_RELAY_SETTLE_MS = 100;
constexpr uint32_t MOTOR_RAMP_INTERVAL_MS = 20;
constexpr uint8_t MOTOR_RAMP_STEP_PERCENT = 2;
constexpr uint32_t MOTOR_PWM_FREQUENCY_HZ = 5000;
constexpr uint8_t MOTOR_PWM_BITS = 8;
constexpr uint8_t MOTOR_PWM_CHANNEL = 0;  // Arduino-ESP32 2.x only

// 600 rising edges/cycles on channel A per mechanical revolution.
constexpr uint32_t PULSES_PER_REVOLUTION = 600;
constexpr uint8_t QUADRATURE_DECODE_MULTIPLIER = 4;
constexpr uint32_t COUNTS_PER_REVOLUTION =
    PULSES_PER_REVOLUTION * QUADRATURE_DECODE_MULTIPLIER;

// Change to -1 if the displayed positive/negative direction is opposite to
// the direction convention you want to use later.
constexpr int8_t ENCODER_DIRECTION_SIGN = 1;

// Forward declaration keeps Arduino's generated function prototypes valid.
struct SensorFrame;

constexpr uint8_t MLX90614_ADDRESS = 0x5A;
constexpr uint8_t INA219_I2C_ADDRESS = 0x40;
constexpr uint8_t VL53L0X_ADDRESS = 0x29;

// ------------------------------- Hardware --------------------------------

// ESP32 I2C controller 0 is the global Wire object on GPIO21/GPIO22.
// ESP32 I2C controller 1 is dedicated to the right VL53L0X.
TwoWire I2C_BUS_2 = TwoWire(1);

Adafruit_ADXL345_Unified adxl345(12345);
Adafruit_MLX90614 mlx90614;
Adafruit_INA219 ina219(INA219_I2C_ADDRESS);
Adafruit_VL53L0X leftTof;
Adafruit_VL53L0X rightTof;

bool bus1Ready = false;
bool bus2Ready = false;
bool bus1Addresses[128] = {false};
bool bus2Addresses[128] = {false};

bool adxl345Ready = false;
bool mlx90614Ready = false;
bool ina219Ready = false;
bool leftTofReady = false;
bool rightTofReady = false;
uint8_t adxl345Address = 0;

// ----------------------------- Motor state -------------------------------

bool motorPwmReady = false;
bool motorEmergencyStopLatched = true;
bool motorRunRequested = false;
bool motorRelayOn = false;
bool motorCommandReceived = false;
uint8_t motorTargetPercent = 0;
uint8_t motorAppliedPercent = 0;
uint32_t motorCommandSequence = 0;
uint32_t lastMotorCommandMs = 0;
uint32_t relayEnabledAtMs = 0;
uint32_t lastMotorRampMs = 0;

char motorCommandBuffer[96] = {};
size_t motorCommandLength = 0;

uint8_t relayLevel(bool enabled) {
  return enabled == RELAY_ACTIVE_LOW ? LOW : HIGH;
}

void writeMotorPwm(uint8_t percent) {
  const uint32_t maxDuty = (1UL << MOTOR_PWM_BITS) - 1UL;
  const uint32_t duty =
      (static_cast<uint32_t>(percent) * maxDuty + 50UL) / 100UL;

  if (!motorPwmReady) return;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(MOTOR_ENA_PIN, duty);
#else
  ledcWrite(MOTOR_PWM_CHANNEL, duty);
#endif
}

void setMotorRelay(bool enabled) {
  digitalWrite(RELAY_PIN, relayLevel(enabled));
  if (enabled && !motorRelayOn) relayEnabledAtMs = millis();
  motorRelayOn = enabled;
}

void stopMotorOutputs() {
  motorAppliedPercent = 0;
  writeMotorPwm(0);
  digitalWrite(MOTOR_IN1_PIN, LOW);
  digitalWrite(MOTOR_IN2_PIN, LOW);
  setMotorRelay(false);
}

bool motorCommandFresh(uint32_t now = millis()) {
  return motorCommandReceived &&
         static_cast<uint32_t>(now - lastMotorCommandMs) <=
             MOTOR_COMMAND_TIMEOUT_MS;
}

void configureMotorOutputs() {
  // Preload every output latch before switching its pin to OUTPUT mode.
  digitalWrite(MOTOR_IN1_PIN, LOW);
  digitalWrite(MOTOR_IN2_PIN, LOW);
  digitalWrite(MOTOR_ENA_PIN, LOW);
  digitalWrite(RELAY_PIN, relayLevel(false));
  pinMode(MOTOR_IN1_PIN, OUTPUT);
  pinMode(MOTOR_IN2_PIN, OUTPUT);
  pinMode(MOTOR_ENA_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

#if ESP_ARDUINO_VERSION_MAJOR >= 3
  motorPwmReady =
      ledcAttach(MOTOR_ENA_PIN, MOTOR_PWM_FREQUENCY_HZ, MOTOR_PWM_BITS);
#else
  motorPwmReady =
      ledcSetup(MOTOR_PWM_CHANNEL, MOTOR_PWM_FREQUENCY_HZ, MOTOR_PWM_BITS) > 0;
  if (motorPwmReady) ledcAttachPin(MOTOR_ENA_PIN, MOTOR_PWM_CHANNEL);
#endif

  stopMotorOutputs();
}

void applyMotorCommand(unsigned long sequence, int emergencyStop,
                       int run, int speed) {
  speed = constrain(speed, 0, 100);
  motorCommandReceived = true;
  lastMotorCommandMs = millis();
  motorCommandSequence = static_cast<uint32_t>(sequence);

  if (emergencyStop != 0) {
    motorEmergencyStopLatched = true;
    motorRunRequested = false;
    motorTargetPercent = 0;
    stopMotorOutputs();
    return;
  }

  if (motorEmergencyStopLatched) {
    // A latch can only be cleared by an explicit stopped, zero-speed command.
    if (run == 0 && speed == 0) {
      motorEmergencyStopLatched = false;
      motorRunRequested = false;
      motorTargetPercent = 0;
    }
    return;
  }

  motorTargetPercent = static_cast<uint8_t>(speed);
  motorRunRequested = run != 0 && motorTargetPercent > 0;
  if (!motorRunRequested) stopMotorOutputs();
}

void acceptMotorCommand(const char *line) {
  unsigned long sequence = 0;
  int emergencyStop = 1;
  int run = 0;
  int speed = 0;

  if (sscanf(line, "CONTROL %lu %d %d %d",
             &sequence, &emergencyStop, &run, &speed) != 4) {
    return;
  }

  applyMotorCommand(sequence, emergencyStop, run, speed);
}

void readMotorCommands() {
  while (Serial.available() > 0) {
    const char next = static_cast<char>(Serial.read());
    if (next == '\r') continue;

    if (next == '\n') {
      motorCommandBuffer[motorCommandLength] = '\0';
      acceptMotorCommand(motorCommandBuffer);
      motorCommandLength = 0;
      continue;
    }

    if (motorCommandLength + 1 < sizeof(motorCommandBuffer)) {
      motorCommandBuffer[motorCommandLength++] = next;
    } else {
      motorCommandLength = 0;
    }
  }
}

void updateMotorControl() {
  const uint32_t now = millis();

  if (!motorCommandFresh(now)) {
    if (motorRelayOn || motorAppliedPercent > 0 || motorRunRequested) {
      motorEmergencyStopLatched = true;
    }
    motorRunRequested = false;
    motorTargetPercent = 0;
    stopMotorOutputs();
    return;
  }

  if (motorEmergencyStopLatched || !motorRunRequested ||
      motorTargetPercent == 0 || !motorPwmReady) {
    stopMotorOutputs();
    return;
  }

  // The supplied circuit uses IN1=HIGH, IN2=LOW for forward motion.
  digitalWrite(MOTOR_IN1_PIN, HIGH);
  digitalWrite(MOTOR_IN2_PIN, LOW);

  if (!motorRelayOn) {
    writeMotorPwm(0);
    setMotorRelay(true);
    return;
  }

  if (static_cast<uint32_t>(now - relayEnabledAtMs) <
      MOTOR_RELAY_SETTLE_MS) {
    writeMotorPwm(0);
    return;
  }

  if (static_cast<uint32_t>(now - lastMotorRampMs) <
      MOTOR_RAMP_INTERVAL_MS) {
    return;
  }
  lastMotorRampMs = now;

  if (motorAppliedPercent < motorTargetPercent) {
    motorAppliedPercent = static_cast<uint8_t>(min(
        static_cast<int>(motorTargetPercent),
        static_cast<int>(motorAppliedPercent) + MOTOR_RAMP_STEP_PERCENT));
  } else if (motorAppliedPercent > motorTargetPercent) {
    motorAppliedPercent = static_cast<uint8_t>(max(
        static_cast<int>(motorTargetPercent),
        static_cast<int>(motorAppliedPercent) - MOTOR_RAMP_STEP_PERCENT));
  }

  writeMotorPwm(motorAppliedPercent);
}

// ---------------------------- Encoder state -------------------------------

portMUX_TYPE encoderMux = portMUX_INITIALIZER_UNLOCKED;

volatile int64_t encoderQuadratureCount = 0;
volatile uint64_t encoderAPulseCount = 0;
volatile uint32_t encoderInvalidTransitions = 0;
volatile uint8_t encoderPreviousState = 0;

// Transition lookup for state encoded as AB (A is bit 1, B is bit 0).
// The physical sign depends on A/B wiring, hence ENCODER_DIRECTION_SIGN.
static const int8_t DRAM_ATTR QUADRATURE_TRANSITION[16] = {
    0, -1, +1, 0,
   +1,  0,  0, -1,
   -1,  0,  0, +1,
    0, +1, -1, 0
};

void IRAM_ATTR onEncoderChange() {
  portENTER_CRITICAL_ISR(&encoderMux);

  const uint8_t newState =
      (static_cast<uint8_t>(digitalRead(ENCODER_A_PIN)) << 1) |
      static_cast<uint8_t>(digitalRead(ENCODER_B_PIN));
  const uint8_t oldState = encoderPreviousState;
  const int8_t transition =
      QUADRATURE_TRANSITION[(oldState << 2) | newState];

  if (transition != 0) {
    encoderQuadratureCount += transition * ENCODER_DIRECTION_SIGN;

    // Count one raw pulse for each valid channel-A rising edge. This is an
    // unsigned activity count; direction comes from the quadrature count.
    const bool oldA = (oldState & 0b10) != 0;
    const bool newA = (newState & 0b10) != 0;
    if (!oldA && newA) {
      encoderAPulseCount = encoderAPulseCount + 1;
    }
  } else if (newState != oldState) {
    // Both bits changed before the ISR could observe the intermediate state,
    // usually because of noise or a missed edge.
    encoderInvalidTransitions = encoderInvalidTransitions + 1;
  }

  encoderPreviousState = newState;
  portEXIT_CRITICAL_ISR(&encoderMux);
}

// ---------------------------- Data structure ------------------------------

struct SensorFrame {
  uint32_t timeMs;

  bool accelValid;
  float accelX;
  float accelY;
  float accelZ;
  float accelMagnitude;

  bool temperatureValid;
  float ambientTempC;
  float objectTempC;

  bool inaValid;
  float busVoltageV;
  float shuntVoltagemV;
  float loadVoltageV;
  float currentmA;
  float powermW;

  bool leftTofValid;
  uint16_t leftTofMm;
  uint8_t leftTofStatus;

  bool rightTofValid;
  uint16_t rightTofMm;
  uint8_t rightTofStatus;

  uint8_t encoderA;
  uint8_t encoderB;
  uint64_t encoderAPulses;
  int64_t encoderCount;
  uint32_t encoderInvalid;
  float encoderRevolutions;
  float encoderAPulsesPerSecond;
  float encoderCountsPerSecond;
  float encoderRpm;
  int8_t encoderDirection;
};

uint32_t lastMeasurementMs = 0;
uint32_t lastEncoderSampleMs = 0;
uint64_t lastEncoderAPulses = 0;
int64_t lastEncoderCount = 0;
// ----------------------------- I2C helpers --------------------------------

const char *knownDeviceName(uint8_t address, bool secondBus) {
  if (secondBus && address == VL53L0X_ADDRESS) return "RIGHT VL53L0X";
  if (!secondBus && address == VL53L0X_ADDRESS) return "LEFT VL53L0X";
  if (!secondBus && address == INA219_I2C_ADDRESS) return "INA219";
  if (!secondBus && address == 0x53) return "ADXL345";
  if (!secondBus && address == 0x1D) return "ADXL345 (alternate address)";
  if (!secondBus && address == MLX90614_ADDRESS) return "MLX90614";
  return "unknown device";
}

void scanI2CBus(TwoWire &bus, bool ready, const char *name,
                bool secondBus, bool found[128]) {
  if (!OUTPUT_JSON) {
    Serial.printf("\n%s scan:\n", name);
  }

  if (!ready) {
    if (!OUTPUT_JSON) Serial.println("Controller failed to initialize");
    return;
  }

  uint8_t deviceCount = 0;
  for (uint8_t address = 1; address < 127; ++address) {
    bus.beginTransmission(address);
    const uint8_t error = bus.endTransmission();
    if (error == 0) {
      found[address] = true;
      ++deviceCount;
      if (!OUTPUT_JSON) {
        Serial.printf("0x%02X %s\n", address,
                      knownDeviceName(address, secondBus));
      }
    }
  }

  if (!OUTPUT_JSON && deviceCount == 0) {
    Serial.println("No I2C devices found");
  }
}

void printStatus(const char *name, bool ready) {
  if (!OUTPUT_JSON) {
    Serial.printf("%-12s: %s\n", name, ready ? "OK" : "NOT FOUND");
  }
}

void printAddressArray(const bool found[128]) {
  Serial.print('[');
  bool first = true;
  for (uint8_t address = 1; address < 127; ++address) {
    if (!found[address]) continue;
    if (!first) Serial.print(',');
    Serial.printf("\"0x%02X\"", address);
    first = false;
  }
  Serial.print(']');
}

void printJsonStartup() {
  Serial.print("{\"type\":\"startup\",\"bus1_addresses\":");
  printAddressArray(bus1Addresses);
  Serial.print(",\"bus2_addresses\":");
  printAddressArray(bus2Addresses);
  Serial.printf(
      ",\"adxl345_ok\":%s,\"mlx90614_ok\":%s,\"ina219_ok\":%s,"
      "\"left_tof_ok\":%s,\"right_tof_ok\":%s,\"encoder_ready\":true,"
      "\"pulses_per_revolution\":%lu,\"counts_per_revolution\":%lu,"
      "\"motor_control_ready\":%s,\"motor_pin_ena\":%u,"
      "\"motor_pin_in1\":%u,\"motor_pin_in2\":%u,\"relay_pin\":%u}\n",
      adxl345Ready ? "true" : "false",
      mlx90614Ready ? "true" : "false",
      ina219Ready ? "true" : "false",
      leftTofReady ? "true" : "false",
      rightTofReady ? "true" : "false",
      static_cast<unsigned long>(PULSES_PER_REVOLUTION),
      static_cast<unsigned long>(COUNTS_PER_REVOLUTION),
      motorPwmReady ? "true" : "false",
      MOTOR_ENA_PIN, MOTOR_IN1_PIN, MOTOR_IN2_PIN, RELAY_PIN);
}

// ---------------------------- Sensor reading ------------------------------

bool readTof(Adafruit_VL53L0X &sensor, bool sensorReady,
             uint16_t &distanceMm, uint8_t &rangeStatus) {
  distanceMm = 0;
  rangeStatus = 255;
  if (!sensorReady) return false;

  VL53L0X_RangingMeasurementData_t measurement = {};
  const VL53L0X_Error error = sensor.rangingTest(&measurement, false);
  rangeStatus =
      error == VL53L0X_ERROR_NONE ? measurement.RangeStatus : 255;

  // Status 0 is a valid range. Other statuses identify out-of-range, low
  // signal, sigma, or wraparound failures and are reported but not accepted.
  if (error != VL53L0X_ERROR_NONE || rangeStatus != 0) return false;

  distanceMm = measurement.RangeMilliMeter;
  return true;
}

SensorFrame readSensorFrame() {
  SensorFrame frame = {};
  frame.accelX = frame.accelY = frame.accelZ = NAN;
  frame.accelMagnitude = NAN;
  frame.ambientTempC = frame.objectTempC = NAN;
  frame.busVoltageV = frame.shuntVoltagemV = frame.loadVoltageV = NAN;
  frame.currentmA = frame.powermW = NAN;
  frame.leftTofStatus = 255;
  frame.rightTofStatus = 255;

  if (adxl345Ready) {
    sensors_event_t event;
    frame.accelValid = adxl345.getEvent(&event);
    if (frame.accelValid) {
      frame.accelX = event.acceleration.x;
      frame.accelY = event.acceleration.y;
      frame.accelZ = event.acceleration.z;
      frame.accelMagnitude = sqrtf(
          frame.accelX * frame.accelX +
          frame.accelY * frame.accelY +
          frame.accelZ * frame.accelZ);
    }
  }

  if (mlx90614Ready) {
    frame.ambientTempC = static_cast<float>(mlx90614.readAmbientTempC());
    frame.objectTempC = static_cast<float>(mlx90614.readObjectTempC());
    frame.temperatureValid =
        std::isfinite(frame.ambientTempC) && std::isfinite(frame.objectTempC);
  }

  if (ina219Ready) {
    bool allReadsSucceeded = true;
    frame.busVoltageV = ina219.getBusVoltage_V();
    allReadsSucceeded &= ina219.success();
    frame.shuntVoltagemV = ina219.getShuntVoltage_mV();
    allReadsSucceeded &= ina219.success();
    frame.currentmA = ina219.getCurrent_mA();
    allReadsSucceeded &= ina219.success();
    frame.powermW = ina219.getPower_mW();
    allReadsSucceeded &= ina219.success();
    frame.loadVoltageV =
        frame.busVoltageV + frame.shuntVoltagemV / 1000.0f;
    frame.inaValid = allReadsSucceeded;
  }

  frame.leftTofValid = readTof(leftTof, leftTofReady,
                               frame.leftTofMm, frame.leftTofStatus);
  frame.rightTofValid = readTof(rightTof, rightTofReady,
                                frame.rightTofMm, frame.rightTofStatus);

  uint64_t aPulsesSnapshot;
  int64_t countSnapshot;
  uint32_t invalidSnapshot;
  uint8_t stateSnapshot;

  portENTER_CRITICAL(&encoderMux);
  aPulsesSnapshot = encoderAPulseCount;
  countSnapshot = encoderQuadratureCount;
  invalidSnapshot = encoderInvalidTransitions;
  stateSnapshot = encoderPreviousState;
  portEXIT_CRITICAL(&encoderMux);

  const uint32_t now = millis();
  const uint32_t elapsedMs = now - lastEncoderSampleMs;
  const uint64_t deltaAPulses = aPulsesSnapshot - lastEncoderAPulses;
  const int64_t deltaCounts = countSnapshot - lastEncoderCount;

  frame.timeMs = now;
  frame.encoderA = (stateSnapshot >> 1) & 0x01;
  frame.encoderB = stateSnapshot & 0x01;
  frame.encoderAPulses = aPulsesSnapshot;
  frame.encoderCount = countSnapshot;
  frame.encoderInvalid = invalidSnapshot;
  frame.encoderRevolutions =
      static_cast<float>(countSnapshot) / COUNTS_PER_REVOLUTION;

  if (elapsedMs > 0) {
    const float seconds = elapsedMs / 1000.0f;
    frame.encoderAPulsesPerSecond = deltaAPulses / seconds;
    frame.encoderCountsPerSecond = deltaCounts / seconds;
    frame.encoderRpm =
        (frame.encoderCountsPerSecond / COUNTS_PER_REVOLUTION) * 60.0f;
  }

  frame.encoderDirection =
      deltaCounts > 0 ? +1 : (deltaCounts < 0 ? -1 : 0);

  lastEncoderSampleMs = now;
  lastEncoderAPulses = aPulsesSnapshot;
  lastEncoderCount = countSnapshot;

  return frame;
}

// ------------------------------- Output -----------------------------------

void printJsonFloat(float value, uint8_t digits = 3) {
  if (std::isfinite(value)) Serial.print(value, digits);
  else Serial.print("null");
}

const char *directionText(int8_t direction) {
  if (direction > 0) return "FORWARD";
  if (direction < 0) return "REVERSE";
  return "STOPPED";
}

void printJsonFrame(const SensorFrame &f) {
  Serial.printf("{\"type\":\"measurement\",\"time_ms\":%lu,",
                static_cast<unsigned long>(f.timeMs));

  Serial.printf("\"adxl345_ok\":%s,\"accel_x\":",
                f.accelValid ? "true" : "false");
  printJsonFloat(f.accelX);
  Serial.print(",\"accel_y\":");
  printJsonFloat(f.accelY);
  Serial.print(",\"accel_z\":");
  printJsonFloat(f.accelZ);
  Serial.print(",\"vibration_magnitude\":");
  printJsonFloat(f.accelMagnitude);

  Serial.printf(",\"mlx90614_ok\":%s,\"ambient_temp\":",
                f.temperatureValid ? "true" : "false");
  printJsonFloat(f.ambientTempC, 2);
  Serial.print(",\"object_temp\":");
  printJsonFloat(f.objectTempC, 2);

  Serial.printf(",\"ina219_ok\":%s,\"bus_voltage_v\":",
                f.inaValid ? "true" : "false");
  printJsonFloat(f.busVoltageV, 4);
  Serial.print(",\"shunt_voltage_mv\":");
  printJsonFloat(f.shuntVoltagemV, 4);
  Serial.print(",\"load_voltage_v\":");
  printJsonFloat(f.loadVoltageV, 4);
  Serial.print(",\"current_ma\":");
  printJsonFloat(f.currentmA, 3);
  Serial.print(",\"power_mw\":");
  printJsonFloat(f.powermW, 3);

  Serial.printf(
      ",\"left_tof_ok\":%s,\"left_tof_mm\":",
      f.leftTofValid ? "true" : "false");
  if (f.leftTofValid) Serial.print(f.leftTofMm);
  else Serial.print("null");
  Serial.printf(",\"left_tof_status\":%u", f.leftTofStatus);

  Serial.printf(
      ",\"right_tof_ok\":%s,\"right_tof_mm\":",
      f.rightTofValid ? "true" : "false");
  if (f.rightTofValid) Serial.print(f.rightTofMm);
  else Serial.print("null");
  Serial.printf(",\"right_tof_status\":%u", f.rightTofStatus);

  Serial.printf(
      ",\"encoder_a\":%u,\"encoder_b\":%u,"
      "\"encoder_a_pulse_count\":%llu,\"encoder_count\":%lld,"
      "\"encoder_invalid_transitions\":%lu,\"encoder_revolutions\":",
      f.encoderA, f.encoderB,
      static_cast<unsigned long long>(f.encoderAPulses),
      static_cast<long long>(f.encoderCount),
      static_cast<unsigned long>(f.encoderInvalid));
  printJsonFloat(f.encoderRevolutions, 6);
  Serial.print(",\"encoder_a_pulses_per_sec\":");
  printJsonFloat(f.encoderAPulsesPerSecond, 2);
  Serial.print(",\"encoder_counts_per_sec\":");
  printJsonFloat(f.encoderCountsPerSecond, 2);
  Serial.printf(",\"encoder_direction\":\"%s\",\"encoder_rpm\":",
                directionText(f.encoderDirection));
  printJsonFloat(f.encoderRpm, 2);

  Serial.printf(
      ",\"motor_estop_latched\":%s,\"motor_command_fresh\":%s,"
      "\"motor_run_requested\":%s,\"motor_relay_on\":%s,"
      "\"motor_command_sequence\":%lu,\"motor_target_percent\":%u,"
      "\"motor_pwm_percent\":%u",
      motorEmergencyStopLatched ? "true" : "false",
      motorCommandFresh(f.timeMs) ? "true" : "false",
      motorRunRequested ? "true" : "false",
      motorRelayOn ? "true" : "false",
      static_cast<unsigned long>(motorCommandSequence),
      motorTargetPercent, motorAppliedPercent);
  Serial.println('}');
}

void printHumanFrame(const SensorFrame &f) {
  Serial.println("\n------ SENSOR DATA ------");
  Serial.printf("Time: %lu ms\n", static_cast<unsigned long>(f.timeMs));

  Serial.println("\nADXL345");
  if (f.accelValid) {
    Serial.printf("X: %.3f m/s^2\n", f.accelX);
    Serial.printf("Y: %.3f m/s^2\n", f.accelY);
    Serial.printf("Z: %.3f m/s^2\n", f.accelZ);
    Serial.printf("Magnitude (includes gravity): %.3f m/s^2\n",
                  f.accelMagnitude);
  } else {
    Serial.println("NOT AVAILABLE");
  }

  Serial.println("\nMLX90614");
  if (f.temperatureValid) {
    Serial.printf("Ambient: %.2f deg C\n", f.ambientTempC);
    Serial.printf("Object: %.2f deg C\n", f.objectTempC);
  } else {
    Serial.println("NOT AVAILABLE");
  }

  Serial.println("\nINA219");
  if (f.inaValid) {
    Serial.printf("Bus voltage: %.4f V\n", f.busVoltageV);
    Serial.printf("Shunt voltage: %.4f mV\n", f.shuntVoltagemV);
    Serial.printf("Load voltage: %.4f V\n", f.loadVoltageV);
    Serial.printf("Current: %.3f mA\n", f.currentmA);
    Serial.printf("Power: %.3f mW\n", f.powermW);
    Serial.println("VIN+/VIN- disconnected: values are not electrically meaningful.");
  } else {
    Serial.println("NOT AVAILABLE");
  }

  Serial.println("\nLEFT TOF");
  if (f.leftTofValid) Serial.printf("Distance: %u mm\n", f.leftTofMm);
  else Serial.printf("NO VALID RANGE (status %u)\n", f.leftTofStatus);

  Serial.println("\nRIGHT TOF");
  if (f.rightTofValid) Serial.printf("Distance: %u mm\n", f.rightTofMm);
  else Serial.printf("NO VALID RANGE (status %u)\n", f.rightTofStatus);

  Serial.println("\nENCODER");
  Serial.printf("A/B state: %u/%u\n", f.encoderA, f.encoderB);
  Serial.printf("A pulse count (x1 rising edges): %llu\n",
                static_cast<unsigned long long>(f.encoderAPulses));
  Serial.printf("Total count (signed x4): %lld\n",
                static_cast<long long>(f.encoderCount));
  Serial.printf("Invalid transitions: %lu\n",
                static_cast<unsigned long>(f.encoderInvalid));
  Serial.printf("Direction: %s\n", directionText(f.encoderDirection));
  Serial.printf("Revolutions: %.6f\n", f.encoderRevolutions);
  Serial.printf("A pulses/sec: %.2f\n", f.encoderAPulsesPerSecond);
  Serial.printf("Quadrature counts/sec: %.2f\n", f.encoderCountsPerSecond);
  Serial.printf("RPM (signed): %.2f\n", f.encoderRpm);

  Serial.println("\nMOTOR CONTROL");
  Serial.printf("Emergency stop: %s\n",
                motorEmergencyStopLatched ? "LATCHED" : "RESET");
  Serial.printf("Command heartbeat: %s\n",
                motorCommandFresh() ? "FRESH" : "MISSING");
  Serial.printf("Relay: %s\n", motorRelayOn ? "ON" : "OFF");
  Serial.printf("Target/applied PWM: %u%%/%u%%\n",
                motorTargetPercent, motorAppliedPercent);
  Serial.println("-------------------------");
}

// ------------------------------ Arduino -----------------------------------

void setup() {
  configureMotorOutputs();
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  if (!OUTPUT_JSON) {
    Serial.println("========================================");
    Serial.println(" CONVEYOR SENSOR + MOTOR CONTROL");
    Serial.println("========================================");
    Serial.println("Motor is stopped and emergency stop is latched at boot.");
  }

  // External 5k pull-ups already hold these open-collector signals at 3.3 V.
  // Do not use 5 V pull-ups and do not enable ESP32 internal pull-ups here.
  pinMode(ENCODER_A_PIN, INPUT);
  pinMode(ENCODER_B_PIN, INPUT);
  encoderPreviousState =
      (static_cast<uint8_t>(digitalRead(ENCODER_A_PIN)) << 1) |
      static_cast<uint8_t>(digitalRead(ENCODER_B_PIN));
  attachInterrupt(digitalPinToInterrupt(ENCODER_A_PIN), onEncoderChange, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENCODER_B_PIN), onEncoderChange, CHANGE);

  bus1Ready = Wire.begin(BUS1_SDA_PIN, BUS1_SCL_PIN, I2C_CLOCK_HZ);
  bus2Ready = I2C_BUS_2.begin(BUS2_SDA_PIN, BUS2_SCL_PIN, I2C_CLOCK_HZ);

  scanI2CBus(Wire, bus1Ready, "I2C BUS 1", false, bus1Addresses);
  scanI2CBus(I2C_BUS_2, bus2Ready, "I2C BUS 2", true, bus2Addresses);

  // ADXL345 normally uses 0x53; 0x1D is automatically accepted when SDO/ALT
  // is high so the scan result, rather than an assumption, chooses the address.
  if (bus1Addresses[0x53]) adxl345Address = 0x53;
  else if (bus1Addresses[0x1D]) adxl345Address = 0x1D;

  if (adxl345Address != 0) {
    adxl345Ready = adxl345.begin(adxl345Address);
    if (adxl345Ready) {
      adxl345.setRange(ADXL345_RANGE_16_G);
      adxl345.setDataRate(ADXL345_DATARATE_100_HZ);
    }
  }

  if (bus1Addresses[MLX90614_ADDRESS]) {
    mlx90614Ready = mlx90614.begin(MLX90614_ADDRESS, &Wire);
  }

  if (bus1Addresses[INA219_I2C_ADDRESS]) {
    ina219Ready = ina219.begin(&Wire);
    if (ina219Ready) ina219.setCalibration_32V_2A();
  }

  if (bus1Addresses[VL53L0X_ADDRESS]) {
    leftTofReady = leftTof.begin(VL53L0X_ADDRESS, false, &Wire);
  }

  if (bus2Addresses[VL53L0X_ADDRESS]) {
    // Adafruit_VL53L0X::begin accepts a TwoWire pointer. The ESP32 Wire class
    // retains GPIO16/GPIO17 when the library calls begin() again internally.
    rightTofReady =
        rightTof.begin(VL53L0X_ADDRESS, false, &I2C_BUS_2);
  }

  // Reassert the conservative clock after all library begin() calls.
  if (bus1Ready) Wire.setClock(I2C_CLOCK_HZ);
  if (bus2Ready) I2C_BUS_2.setClock(I2C_CLOCK_HZ);

  if (!OUTPUT_JSON) {
    Serial.println("\nDevice initialization:");
  }
  printStatus("ADXL345", adxl345Ready);
  printStatus("MLX90614", mlx90614Ready);
  printStatus("INA219", ina219Ready);
  printStatus("LEFT TOF", leftTofReady);
  printStatus("RIGHT TOF", rightTofReady);
  printStatus("MOTOR PWM", motorPwmReady);
  if (!OUTPUT_JSON) {
    Serial.println("ENCODER     : READY (rotate shaft to prove A/B signals)");
    Serial.printf("Encoder assumption: %lu A pulses/rev, x%u decoding, %lu counts/rev\n",
                  static_cast<unsigned long>(PULSES_PER_REVOLUTION),
                  QUADRATURE_DECODE_MULTIPLIER,
                  static_cast<unsigned long>(COUNTS_PER_REVOLUTION));
    Serial.println("Motor pins: ENA=25, IN1=18, IN2=19, relay=23.");
    Serial.println("INA219 note: VIN+/VIN- are not in series with the motor in the supplied circuit.");
  } else {
    printJsonStartup();
  }

  portENTER_CRITICAL(&encoderMux);
  lastEncoderAPulses = encoderAPulseCount;
  lastEncoderCount = encoderQuadratureCount;
  portEXIT_CRITICAL(&encoderMux);
  lastEncoderSampleMs = millis();
  lastMeasurementMs = millis();
}

void loop() {
  readMotorCommands();
  updateMotorControl();

  const uint32_t now = millis();
  if (static_cast<uint32_t>(now - lastMeasurementMs) >=
      MEASUREMENT_INTERVAL_MS) {
    lastMeasurementMs = now;
    const SensorFrame frame = readSensorFrame();
    if (OUTPUT_JSON) printJsonFrame(frame);
    else printHumanFrame(frame);
  }

  readMotorCommands();
  updateMotorControl();

  delay(2);  // Yield to ESP32 background tasks without setting sample timing.
}
