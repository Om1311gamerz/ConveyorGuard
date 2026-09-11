# ConveyorGuard

ConveyorGuard is the SIH conveyor-belt monitoring prototype. The website shows
the physical ESP32 sensor stream and provides guarded, forward-only motor speed
control for the supplied circuit.

## Everyday use on this Windows laptop

After the ESP32 has been flashed once, double-click:

```text
START_CONVEYORGUARD.bat
```

This one file starts the local API, website, and automatic Windows COM-port
watcher, then opens the dashboard. Leave its terminal window open and keep the
ESP32 connected with a data-capable USB cable. You can disconnect and reconnect
the ESP32 at any time; the watcher will find it again automatically.

Every backend or ESP32 restart begins with the software emergency stop latched,
zero PWM, and the relay off. The motor cannot start merely because the cable is
connected or the website opens.

The equivalent terminal command is:

```powershell
npm run system
```

The starter selects another free local port if 5000 or 5173 is already occupied.
The motor-control API stays on localhost, and the serial bridge forwards the
ESP32 JSON stream directly to it over local HTTP.

## First-time ESP32 setup

The website runtime does **not** require Arduino IDE. A new or unflashed ESP32
requires one firmware upload:

1. Keep AC and the 24 V motor output switched off while uploading firmware.
2. Connect the ESP32 using a data-capable USB cable.
3. Open `hardware/conveyor_sensor_test/conveyor_sensor_test.ino` in Arduino IDE.
4. Install `esp32 by Espressif Systems` in Boards Manager.
5. Install these Library Manager packages: Adafruit ADXL345, Adafruit Unified
   Sensor, Adafruit MLX90614 Library, Adafruit INA219, Adafruit_VL53L0X, and
   Adafruit BusIO.
6. Select **ESP32 Dev Module**, select the COM port, and click **Upload**.
7. Close Arduino Serial Monitor and double-click `START_CONVEYORGUARD.bat`.

The integrated sketch already has `OUTPUT_JSON true`, sends a complete JSON
sample every 100 ms, and listens for the guarded USB motor-command heartbeat.
Full wiring and troubleshooting details are in
`hardware/SENSOR_TEST_GUIDE.md`.

## Circuit mapping used by the firmware

The code follows the supplied schematic exactly:

| Function | ESP32 pin |
| --- | --- |
| Motor driver ENA (PWM) | GPIO25 |
| Motor driver IN1 | GPIO18 |
| Motor driver IN2 | GPIO19 |
| Relay module IN | GPIO23 |
| I²C bus 1 SDA/SCL | GPIO21/GPIO22 |
| Right ToF bus SDA/SCL | GPIO16/GPIO17 |
| Encoder A/B | GPIO32/GPIO33 |

The relay input is configured as active-low, which matches the common 5 V
two-channel relay module shown in the project photos. Before connecting 24 V,
power only the ESP32, buck converter, and relay logic and confirm the selected
relay remains off while the dashboard says **E-STOP LATCHED**. If it turns on,
disconnect power and set `RELAY_ACTIVE_LOW` to `false` in the sketch before use.

## Live data path

```text
ADXL345 + MLX90614 + INA219 + two VL53L0X + encoder
                           ↓
                         ESP32
                  USB JSON stream at 10 Hz
                           ↓
              automatic serial-port watcher
                           ↓ local HTTP
                    Node.js backend
                           ↓ 100 ms polling
                 ConveyorGuard dashboard
                           ↓ guarded command
     emergency stop / arm / start / speed slider
                           ↓ USB
               GPIO23 relay + GPIO25 PWM + GPIO18/19
```

The ESP32 card displays every field currently emitted by the firmware:

- sensor initialization and both I2C address scans;
- acceleration X/Y/Z and total magnitude;
- MLX90614 ambient and object temperatures;
- both ToF distances, both range-status codes, and raw L/R difference;
- encoder A/B state, A-pulse count, signed x4 count, invalid transitions,
  revolutions, pulses/second, counts/second, direction, and RPM;
- INA219 bus, shunt, and load voltage, current, and power; and
- ESP32 sample time, host sample age, API state, and ESP32 live/offline state.

The drive card displays the backend safety latch, applied PWM, relay state,
encoder RPM, and USB command watchdog. Operation is
deliberately sequenced:

1. Reset the software emergency stop.
2. Arm at zero speed.
3. Select a low PWM percentage.
4. Press Start and confirm the belt area is clear.

**STOP MOTOR NOW** immediately commands zero PWM, de-energizes the relay, and
latches the software stop. Losing USB commands for 750 ms does the same, and
reconnecting never restarts the motor automatically.

INA219 VIN+/VIN- remain disconnected in this phase, so its electrical values
are shown with a warning and are not electrically meaningful yet. The existing
NORMAL/WARNING/CRITICAL simulator controls cannot operate physical hardware.

## Before applying AC or 24 V motor power

Do not energize the photographed open wiring. First place the mains terminals
and SMPS in an insulated enclosure, add correctly rated input protection, bond
protective earth, add strain relief, and install a hard-wired latching physical
emergency stop that removes motor power. The website button, ESP32, and small
relay module are not safety-rated substitutes.

With motor power still off, start ConveyorGuard and confirm all of these:

- the dashboard says **E-STOP LATCHED**;
- driver relay is **OFF** and applied PWM is **0%**;
- USB watchdog reports stopped/healthy only after readings begin; and
- encoder and both ToF sensors update correctly.

For the first powered motion test, mechanically unload the belt if possible,
stand clear, begin at 5–10%, and keep the physical emergency stop within reach.

## Manual USB diagnostics

Windows can run the bridge without Python:

```powershell
powershell -ExecutionPolicy Bypass -File hardware/read_esp32.ps1
```

If several COM ports exist, select one explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File hardware/read_esp32.ps1 -Port COM5
```

macOS/Linux can use the cross-platform Python bridge, which also auto-watches
and reconnects:

```bash
python3 -m pip install pyserial
python3 hardware/read_esp32.py
```

Use `--csv sensor_log.csv` for optional CSV logging or `--no-api` for terminal-
only diagnostics. Close Arduino Serial Monitor before either bridge.

## First install only

The dependencies are already present in this checkout. On a fresh copy, run:

```powershell
npm install
cd server
npm install
```
