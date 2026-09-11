# SIH conveyor sensor and guarded motor control

This package streams every connected sensor and encoder reading and controls the
supplied JZ2407DB-B-style motor-driver circuit through the local ConveyorGuard
dashboard. Motor control is forward-only and starts in a latched stop state.

When this copy is used inside ConveyorGuard, the Windows `read_esp32.ps1`
watcher or the cross-platform `read_esp32.py` bridge forwards JSON to the local
website backend. Both bridges reconnect automatically. On Windows, simply
double-click `START_CONVEYORGUARD.bat`; no Python package is required.

The ConveyorGuard copy of the sketch already sets `OUTPUT_JSON true` so the
serial bridge can parse it. Set it to `false` temporarily only when you want the
large human-readable Serial Monitor blocks instead of website data.

## 1. Arduino libraries to install

In Arduino IDE, open **Tools > Manage Libraries** and install these exact
Library Manager names:

1. **Adafruit ADXL345**
2. **Adafruit Unified Sensor**
3. **Adafruit MLX90614 Library**
4. **Adafruit INA219**
5. **Adafruit_VL53L0X**
6. **Adafruit BusIO**

Accept Arduino IDE's offer to install dependencies. No encoder library and no
JSON library are needed. The sketch creates JSON directly, avoiding extra
memory and another dependency.

The sketch uses the currently documented APIs:

- `mlx90614.begin(address, &Wire)`
- `ina219.begin(&Wire)`
- `leftTof.begin(0x29, false, &Wire)`
- `rightTof.begin(0x29, false, &I2C_BUS_2)`

In particular, **Adafruit VL53L0X** supports a `TwoWire *` argument. Do not
replace it with a VL53L0X library whose `begin()` is hard-wired to `Wire`.

Install the ESP32 board package from **Tools > Board > Boards Manager**:

- **esp32 by Espressif Systems**

## 2. Software-relevant wiring findings

The two-bus arrangement is correct and necessary because both GY-530 boards
start at address `0x29` and the installed boards do not expose XSHUT. The left
unit stays on `Wire` at GPIO21/GPIO22. The right unit is passed explicitly to
`TwoWire(1)` at GPIO16/GPIO17.

The motor-control pins follow the supplied circuit diagram:

- GPIO25 → driver ENA (5 kHz PWM)
- GPIO18 → driver IN1
- GPIO19 → driver IN2
- GPIO23 → relay-module IN
- driver and relay logic grounds → ESP32 common ground

The firmware uses IN1 high/IN2 low for forward travel. The selected relay is
assumed active-low. With 24 V disconnected, verify its LED and contacts remain
off while the ESP32 boots and the website shows `E-STOP LATCHED`. If not, set
`RELAY_ACTIVE_LOW` to `false`, recompile, and repeat the logic-only test.

Check these points before powering the ESP32:

- Keep every I2C signal at 3.3 V. Many breakout boards include pull-ups; several
  parallel pull-ups can become too strong. If the bus is unreliable, measure
  SDA/SCL while powered off and inspect the modules before adding more pull-ups.
- The shared bus is deliberately run at 100 kHz. This is conservative for the
  MLX90614 and is sufficient for this diagnostic.
- An ADXL345 at `0x1D` is not necessarily faulty; its SDO/ALT-address state
  selected the alternate address. The sketch scans and accepts either `0x53`
  or `0x1D`. The ADXL345 must also be strapped for I2C mode as required by its
  breakout (commonly CS high).
- INA219 VIN+ and VIN- are floating in this phase. Bus voltage, shunt voltage,
  load voltage, current, and power may be zero, noisy, or meaningless even when
  `INA219: OK`. Only I2C communication is proven now.
- The encoder must be an NPN open-collector variant. Green/A and white/B each
  need the schematic's external 5k pull-up to **ESP32 3.3 V**, never 5 V.
- Verify the encoder's own label says its red supply wire accepts 5 V. Similar
  3806 encoders are sold in both 5–24 V and 10–24 V variants. A 10–24 V-only
  unit may not operate from USB 5 V; do not introduce 24 V during this phase.
- `ENCODER: READY` means only that GPIO interrupts are installed. With pull-ups,
  software cannot distinguish an attached stationary encoder from disconnected
  A/B wires. Manual shaft rotation must change the counts to prove the hardware.
- `vibration_magnitude` is the instantaneous acceleration-vector magnitude and
  therefore includes gravity. It is useful for this hardware test, but is not
  yet a gravity-removed or filtered vibration feature for ML.

## 3. Encoder-count convention

At the top of the sketch:

```cpp
constexpr uint32_t PULSES_PER_REVOLUTION = 600;
constexpr uint8_t QUADRATURE_DECODE_MULTIPLIER = 4;
constexpr uint32_t COUNTS_PER_REVOLUTION = 2400;
```

This interprets 600 PPR as 600 complete channel-A cycles/rising edges per shaft
revolution, then decodes all four A/B edges. One exact manual revolution should
therefore produce about 600 additional `A pulse count` events and approximately
+2400 or -2400 signed `Total count` events. If the encoder's verified datasheet
defines 600 as an already-x4 count, change the constants based on that datasheet
and the one-revolution test. `ENCODER_DIRECTION_SIGN` can be changed from `1`
to `-1` without swapping physical wires.

## 4. Compile and upload with Arduino IDE

1. Keep AC input and the 24 V motor output switched off.
2. Power the ESP32 through its USB cable while uploading.
3. Open `conveyor_sensor_test/conveyor_sensor_test.ino` in Arduino IDE.
4. Select **Tools > Board > esp32 > ESP32 Dev Module**.
5. Select the ESP32 under **Tools > Port**.
6. Click **Verify**, then **Upload**.
7. If upload remains at `Connecting...`, hold **BOOT**, start Upload, release
   BOOT when writing begins. Most DevKit boards do this automatically.
8. Open **Tools > Serial Monitor**, set **115200 baud**, and reset the board once.

The Arduino sketch directory and `.ino` basename intentionally match, as
required by Arduino IDE.

### Optional Arduino CLI commands

After installing `arduino-cli` on the Mac:

```bash
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install "Adafruit ADXL345" "Adafruit Unified Sensor" "Adafruit MLX90614 Library" "Adafruit INA219" "Adafruit_VL53L0X" "Adafruit BusIO"
arduino-cli board list
arduino-cli compile --fqbn esp32:esp32:esp32 conveyor_sensor_test
arduino-cli upload --port /dev/cu.usbserial-0001 --fqbn esp32:esp32:esp32 conveyor_sensor_test
```

Replace the example port with the value from `arduino-cli board list`.

## 5. Output and control protocol

The original standalone diagnostic defaults to human-readable output. This
ConveyorGuard-integrated copy uses:

```cpp
#define OUTPUT_JSON true
```

Set it to `false` to produce the full human-readable block ten times per second. If that
scrolls too quickly during manual inspection, increase
`MEASUREMENT_INTERVAL_MS` from `100` to `500`.

Set `OUTPUT_JSON true`, verify, and upload again to produce newline-delimited
JSON. JSON mode emits one `startup` object followed by one `measurement` object
per interval. Missing or invalid sensor values are JSON `null`, while the
corresponding `_ok` field is `false`. Each object is entirely on one line.

The bridge returns a line in this format after every API response:

```text
CONTROL sequence emergency_stop run speed_percent
```

Firmware accepts a run command only after a stopped zero-speed command clears
its boot latch. It ramps normal speed changes by 2 percentage points every
20 ms. Emergency stop, normal Stop, API loss, or a missing serial heartbeat for
750 ms forces PWM to zero and switches the relay off immediately. A watchdog
stop latches and therefore does not automatically restart when communication
returns.

## 6. Read the ESP32 on Windows

Close Arduino Serial Monitor, then run `START_CONVEYORGUARD.bat` from the project
root. It starts the complete website and automatically waits for a COM port.
The board can be disconnected and reconnected while the starter remains open.

For bridge-only diagnostics:

```powershell
powershell -ExecutionPolicy Bypass -File read_esp32.ps1
```

If multiple COM ports are attached, pass the ESP32 port explicitly with
`-Port COM5` (replace `COM5` with the actual value).

## 7. Read the ESP32 on macOS/Linux

Only one program can normally own the serial port. Close Arduino Serial Monitor
before starting Python.

From Terminal, change into the directory containing `read_esp32.py`, then run:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install pyserial
```

Find the port either with shell commands:

```bash
ls /dev/cu.usbserial-* /dev/cu.SLAB_USBtoUART* /dev/cu.usbmodem* /dev/cu.wchusbserial* 2>/dev/null
```

or with the supplied script:

```bash
python3 read_esp32.py --list
```

Display readings live:

```bash
python3 read_esp32.py --port /dev/cu.usbserial-0001
```

The script prioritizes ports whose USB description looks like an ESP32/CP210x/
CH340 device and auto-selects the best match. It waits when no port is present
and reconnects after unplug/replug. Use `--port` to override its choice.

With the sketch in JSON mode, display and log timestamped CSV rows:

```bash
python3 read_esp32.py --port /dev/cu.usbserial-0001 --csv sensor_log.csv
```

The file is flushed after every measurement so a stopped test loses at most the
line currently being received. In human-readable mode, the script displays all
lines but intentionally does not try to infer CSV columns from formatted text.

Useful alternatives:

```bash
python3 read_esp32.py --port /dev/cu.usbserial-0001 --raw-json
python3 read_esp32.py --help
```

Press **Ctrl-C** to close the serial connection cleanly.

## 8. Expected Serial output

With all devices detected, the beginning of human-readable mode should resemble:

```text
========================================
 CONVEYOR SENSOR TEST
========================================
Motor is stopped and emergency stop is latched at boot.

I2C BUS 1 scan:
0x29 LEFT VL53L0X
0x40 INA219
0x53 ADXL345
0x5A MLX90614

I2C BUS 2 scan:
0x29 RIGHT VL53L0X

Device initialization:
ADXL345     : OK
MLX90614    : OK
INA219      : OK
LEFT TOF    : OK
RIGHT TOF   : OK
ENCODER     : READY (rotate shaft to prove A/B signals)
Encoder assumption: 600 A pulses/rev, x4 decoding, 2400 counts/rev
```

A measurement should resemble:

```text
------ SENSOR DATA ------
Time: 5231 ms

ADXL345
X: 0.120 m/s^2
Y: -0.210 m/s^2
Z: 9.740 m/s^2
Magnitude (includes gravity): 9.743 m/s^2

MLX90614
Ambient: 29.40 deg C
Object: 31.20 deg C

INA219
Bus voltage: 0.0000 V
Shunt voltage: 0.0000 mV
Load voltage: 0.0000 V
Current: 0.000 mA
Power: 0.000 mW
VIN+/VIN- disconnected: values are not electrically meaningful.

LEFT TOF
Distance: 143 mm

RIGHT TOF
Distance: 147 mm

ENCODER
A/B state: 1/1
A pulse count (x1 rising edges): 300
Total count (signed x4): 1200
Invalid transitions: 0
Direction: FORWARD
Revolutions: 0.500000
A pulses/sec: 150.00
Quadrature counts/sec: 600.00
RPM (signed): 15.00
-------------------------
```

Actual signs, temperatures, distances, and idle A/B state will differ. A steady
sensor can legitimately report `STOPPED` and `0.00` RPM.

One JSON measurement line resembles:

```json
{"type":"measurement","time_ms":5231,"adxl345_ok":true,"accel_x":0.120,"accel_y":-0.210,"accel_z":9.740,"vibration_magnitude":9.743,"mlx90614_ok":true,"ambient_temp":29.40,"object_temp":31.20,"ina219_ok":true,"bus_voltage_v":0.0000,"shunt_voltage_mv":0.0000,"load_voltage_v":0.0000,"current_ma":0.000,"power_mw":0.000,"left_tof_ok":true,"left_tof_mm":143,"left_tof_status":0,"right_tof_ok":true,"right_tof_mm":147,"right_tof_status":0,"encoder_a":1,"encoder_b":1,"encoder_a_pulse_count":300,"encoder_count":1200,"encoder_invalid_transitions":0,"encoder_revolutions":0.500000,"encoder_a_pulses_per_sec":150.00,"encoder_counts_per_sec":600.00,"encoder_direction":"FORWARD","encoder_rpm":15.00}
```

## 9. Troubleshooting

### No serial output or upload fails

- Confirm **115200 baud**, the correct ESP32 board, and the `/dev/cu.*` port.
- Try a known data-capable USB cable and another USB port/adapter.
- Close Python or Serial Monitor before the other program opens the port.
- If no USB serial device appears, identify whether the board uses CP210x or
  CH340 USB-UART hardware and install its macOS driver only from the chip
  manufacturer's trusted source if the current macOS version needs it.
- Use the BOOT-button procedure in the upload steps. Press EN/RESET after upload.

### Entire I2C bus 1 is empty

- Verify common ground, GPIO21=SDA, GPIO22=SCL, and 3.3 V power.
- Check that SDA and SCL were not swapped.
- Disconnect bus-1 modules one at a time; one miswired or damaged module can
  hold an entire bus low.
- With power on, idle SDA and SCL should both be high near 3.3 V. Never apply
  5 V to an ESP32 GPIO.

### ADXL345 not found

- Look in the scan for `0x53` or alternate `0x1D`; both are accepted.
- Confirm the breakout is configured for I2C, commonly by holding CS high.
- Stabilize SDO/ALT ADDRESS rather than leaving it floating.
- When stationary, expect total magnitude near 9.81 m/s², mostly on the axis
  aligned with gravity. If values clip during handling, the sketch already uses
  the ±16 g range.

### MLX90614 not found or reads invalid temperatures

- Expect address `0x5A` on bus 1.
- Keep the bus at the sketch's 100 kHz setting.
- Confirm the particular GY-906 board is safe at 3.3 V and its pull-ups do not
  raise SDA/SCL above 3.3 V.
- Aim the sensor at a nearby non-reflective object; object temperature depends
  on field of view, emissivity, distance, and reflective surfaces.

### INA219 not found or values look wrong

- Expect address `0x40` when A0/A1 address jumpers are unchanged.
- Check only VCC, GND, SDA, and SCL in this phase.
- Do not connect VIN+ or VIN- merely to make the values nonzero. Floating sense
  inputs make electrical measurements meaningless; `INA219: OK` is the success
  criterion for this phase.

### Left ToF fails

- It must appear as `0x29` under **I2C BUS 1**, not bus 2.
- Check GPIO21/GPIO22, 3.3 V, ground, protective film, target distance, and
  target reflectivity.
- A range status other than `0` means the reading was rejected; status `255`
  means no usable library transaction/status was available.

### Right ToF fails

- It must appear as `0x29` under **I2C BUS 2** on GPIO16/GPIO17.
- Do not join its SDA/SCL wires to GPIO21/GPIO22.
- Both ToF sensors showing `0x29` is correct because they are on different ESP32
  controllers.
- Apply the same target/film/range checks as the left sensor.

### Encoder stays at zero

- Verify red receives 5 V only if the encoder label permits 5 V; black must join
  ESP32 ground.
- Verify green/A goes to GPIO32 and white/B to GPIO33.
- Measure each stopped signal: the external 5k resistor should pull it near
  3.3 V, and slow shaft movement should make it alternate between near 0 V and
  near 3.3 V.
- Never move either pull-up to 5 V.
- If A changes but the total count jitters around zero, inspect B wiring. If both
  change but `Invalid transitions` grows rapidly during slow movement, inspect
  grounding, loose wires, and signal noise.
- If the count is consistently negative for the desired forward direction,
  change `ENCODER_DIRECTION_SIGN` to `-1`.
- Validate resolution by marking the shaft and making exactly one revolution;
  expect about 600 A pulses and 2400 signed x4 counts under this configuration.

Do not apply motor power until all devices initialize, encoder checks are
repeatable, relay-off polarity is proven with 24 V disconnected, and a physical
latching emergency-stop circuit independently removes motor power. Enclose the
exposed AC terminals and add correctly rated protection before energizing them.
