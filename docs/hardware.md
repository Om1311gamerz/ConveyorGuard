# ESP32 and sensor architecture

The repository contains diagnostic firmware and reconnecting USB bridges. It does not establish that the assembled hardware is correctly wired or calibrated. This review did not compile/upload firmware, open a serial port, energize a motor, or test physical sensors.

## Implemented firmware interfaces

The sketch is `hardware/conveyor_sensor_test/conveyor_sensor_test.ino`. It targets an ESP32 DevKit-style configuration, emits newline-delimited JSON at 115200 baud, and targets a 100 ms measurement interval. Actual timing depends on transactions and firmware execution.

| Device | Purpose | Interface in sketch | Raw fields / limits |
|---|---|---|---|
| ADXL345 | Acceleration feature | I²C bus 1, GPIO21 SDA /22 SCL; 0x53 or0x1D | `accel_x/y/z` m/s²; raw magnitude includes gravity; ±16 g setting |
| MLX90614 | Surface temperature | Bus 1, 0x5A, 100 kHz bus | `object_temp`, `ambient_temp` °C; emissivity/field-of-view matter |
| INA219 | Electrical diagnostics | Bus 1, 0x40 | `current_ma`, bus/shunt/load voltage, power; device discovery is not proof of motor-current measurement |
| Left VL53L0X | Left target distance | Bus 1, 0x29 | `left_tof_mm`, status; accepted range status 0 |
| Right VL53L0X | Right target distance | I²C bus 2, GPIO16 SDA /17 SCL, 0x29 | Separate bus permits same address; `right_tof_mm` |
| Rotary encoder | Signed movement and RPM | A GPIO32 /B GPIO33 interrupt decoding | 600 A rising edges/rev assumption, x4 =2400 counts/rev; verify actual encoder |
| Driver/relay outputs | Existing supplementary control | IN1 GPIO18, IN2 GPIO19, ENA GPIO25, relay GPIO23 | Existing active-low relay assumption must be physically verified; no ratings inferred |

The original diagnostic guide explicitly leaves INA219 VIN+/VIN− disconnected. Motor current therefore defaults to unknown even if `ina219_ok` is true. Do not connect a sense path simply to create a nonzero dashboard value. Independent review must establish safe voltage/current/shunt ratings and wiring.

## Raw and normalized contracts

The bridge posts actual firmware JSON to `POST /api/hardware/serial`. Startup declares discovered I²C devices and pin/encoder configuration. Measurement contains sensor `_ok` flags, nullable numeric values and motor status. New metadata is `source: "ESP32"`, `conveyorId: "CB-01"`; packets without it remain supported as legacy serial packets. An explicitly different source is rejected.

Minimal illustrative packet (numbers here are a protocol example, not a claim of measured hardware):

```json
{"type":"measurement","source":"ESP32","conveyorId":"CB-01","time_ms":5231,"adxl345_ok":true,"accel_x":0.12,"accel_y":-0.21,"accel_z":9.74,"mlx90614_ok":true,"object_temp":31.2,"ina219_ok":true,"motorCurrentMeasured":false,"current_ma":null,"left_tof_ok":true,"left_tof_mm":143,"right_tof_ok":true,"right_tof_mm":147,"encoder_count":1200,"encoder_rpm":15,"motor_estop_latched":true}
```

The hardware state sanitizes numeric fields; invalid/non-numeric values become null. Adapter output uses the canonical sensor contract documented in [API](api.md). Actual normalized readings are persisted at most once a second; RMS receives every accepted serial measurement. Raw diagnostics remain available separately.

| Health value | Derivation | Gate |
|---|---|---|
| Vibration feature | `sqrt(mean(sum((axis − window mean axis)²)))`, latest20 samples | Unknown until20 valid vectors; invalid sample or restart resets window |
| Temperature | MLX object temperature °C | `mlx90614_ok` and valid reading |
| Motor current | Absolute `current_ma /1000` A | `currentMeasurementValid` setting plus valid INA measurement |
| Alignment deviation | `abs(left_mm − right_mm − alignmentOffsetMm)` | Both ToF readings and explicit baseline calibration |
| Belt speed | `abs(encoder_rpm)/60 × π × roller diameter` m/s | Explicit geometry calibration |
| Belt position | Signed `encoder_count/(PPR ×4) × π × diameter`, modulo belt length | Geometry calibrated, fresh heartbeat and encoder sample |

At nominal10 Hz the RMS window is approximately2 s and cannot establish high-frequency vibration diagnosis. It is acceleration RMS, not mm/s vibration velocity. Sensor mounting/orientation changes invalidate the baseline. Likewise, a ToF difference becomes a belt-centering metric only with a suitable mechanically verified sensor arrangement.

Default geometry (2 m loop, 0.05 m roller, 600 PPR) and thresholds are demonstration assumptions. Settings flags record a commissioning assertion; they do not physically validate geometry, current sensing or alignment. Physical counter homing and slip calibration remain planned.

## Monitoring commands

From the repository root, install JavaScript dependencies and run `npm run system` for software only, or `npm run demo` for a visibly labelled simulator. Neither opens USB.

Only when intentionally monitoring the ESP32:

```powershell
npm run system:hardware
# Or start npm run system, then explicitly choose the actual port:
powershell -NoProfile -ExecutionPolicy Bypass -File hardware/read_esp32.ps1 -Port COM5 -ApiUrl http://127.0.0.1:5000/api/hardware/serial
```

For Python bridge diagnostics:

```bash
python -m pip install -r hardware/requirements.txt
python hardware/read_esp32.py --list
python hardware/read_esp32.py --port ACTUAL_PORT --api-url http://127.0.0.1:5000/api/hardware/serial
```

Recognized ESP32 USB descriptors are eligible for automatic selection. Windows requires a single recognized candidate; specify a port when ambiguous. Close Arduino Serial Monitor before opening a bridge. Use the URL printed by the launcher if its API port differs. Bridges reconnect; losing the API or serial heartbeat does not automatically request motor restart.

## Physical control boundary

The existing CONTROL reply protocol, boot stop latch, ramping and 750 ms firmware command watchdog remain. Backend heartbeat expiry is600 ms. Default `ALLOW_MOTOR_CONTROL=false`; reset/arm/speed/start are rejected and demo blocks actuation even if that setting changes. No browser actuator UI was introduced.

The sketch has no physical emergency-stop GPIO. The software emergency-stop state is not confirmation of a real latching device. A physical safety circuit must independently remove motor power, with suitable guarding, electrical protection and reviewed relay/driver polarity. Changing an environment flag is not commissioning approval.

Full original wiring and Arduino-library instructions remain in [SENSOR_TEST_GUIDE](../hardware/SENSOR_TEST_GUIDE.md), now updated for explicit hardware startup and truthful measurement interpretation.
