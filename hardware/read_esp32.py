#!/usr/bin/env python3
"""Read and optionally log the SIH conveyor ESP32 diagnostic stream.

The script accepts either the sketch's human-readable output or its newline-
delimited JSON output. CSV logging records JSON measurement objects only.
"""

from __future__ import annotations

import argparse
import csv
import json
import queue
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    import serial
    from serial import SerialException
    from serial.tools import list_ports
except ImportError:
    print(
        "pyserial is not installed. Run: python3 -m pip install pyserial",
        file=sys.stderr,
    )
    raise SystemExit(2)


BAUD_RATE = 115200
DEFAULT_API_URL = "http://localhost:5000/api/hardware/serial"

MAC_PORT_PREFIXES = (
    "/dev/cu.usbserial",
    "/dev/cu.SLAB_USBtoUART",
    "/dev/cu.usbmodem",
    "/dev/cu.wchusbserial",
)

ESP32_PORT_HINTS = (
    "cp210",
    "ch340",
    "ch341",
    "silicon labs",
    "usb serial",
    "usb jtag",
    "usb-to-uart",
    "wch",
    "esp32",
)

# Stable output order for the sketch in this package. Unknown future JSON keys
# are appended when the CSV file is first created.
PREFERRED_CSV_FIELDS = [
    "host_timestamp_utc",
    "time_ms",
    "adxl345_ok",
    "accel_x",
    "accel_y",
    "accel_z",
    "vibration_magnitude",
    "mlx90614_ok",
    "ambient_temp",
    "object_temp",
    "ina219_ok",
    "bus_voltage_v",
    "shunt_voltage_mv",
    "load_voltage_v",
    "current_ma",
    "power_mw",
    "left_tof_ok",
    "left_tof_mm",
    "left_tof_status",
    "right_tof_ok",
    "right_tof_mm",
    "right_tof_status",
    "encoder_a",
    "encoder_b",
    "encoder_a_pulse_count",
    "encoder_count",
    "encoder_invalid_transitions",
    "encoder_revolutions",
    "encoder_a_pulses_per_sec",
    "encoder_counts_per_sec",
    "encoder_direction",
    "encoder_rpm",
    "motor_estop_latched",
    "motor_command_fresh",
    "motor_run_requested",
    "motor_relay_on",
    "motor_command_sequence",
    "motor_target_percent",
    "motor_pwm_percent",
]


def is_likely_esp32(port: Any) -> bool:
    device = str(port.device)
    if device.startswith(MAC_PORT_PREFIXES):
        return True

    description = str(port.description or "").casefold()
    hardware_id = str(port.hwid or "").casefold()
    return any(hint in f"{description} {hardware_id}" for hint in ESP32_PORT_HINTS)


def port_rank(port: Any) -> tuple[int, int, str]:
    """Sort likely ESP32 serial devices before unrelated ports."""
    device = str(port.device)
    likely_rank = 0 if is_likely_esp32(port) else 1

    for prefix_rank, prefix in enumerate(MAC_PORT_PREFIXES):
        if device.startswith(prefix):
            return likely_rank, prefix_rank, device.casefold()

    native_rank = 0 if device.upper().startswith("COM") or device.startswith("/dev/cu.") else 1
    return likely_rank, len(MAC_PORT_PREFIXES) + native_rank, device.casefold()


def available_ports() -> list[Any]:
    return sorted(list(list_ports.comports()), key=port_rank)


def print_ports(ports: Iterable[Any]) -> None:
    ports = list(ports)
    if not ports:
        print("No serial ports found.")
        return

    print("Available serial ports:")
    for index, port in enumerate(ports, start=1):
        details = port.description or "no description"
        hardware_id = port.hwid or "no hardware ID"
        likely = " [likely ESP32]" if is_likely_esp32(port) else ""
        print(f"  {index}: {port.device} - {details} - {hardware_id}{likely}")


def choose_port(requested_port: str | None) -> str:
    if requested_port:
        return requested_port

    ports = available_ports()
    likely = [p for p in ports if is_likely_esp32(p)]

    if likely:
        selected = likely[0]
        if len(likely) > 1:
            print_ports(ports)
        print(f"Auto-selected likely ESP32 port {selected.device}")
        return selected.device

    if not ports:
        raise RuntimeError(
            "No serial device is present. Connect the ESP32 with a data-capable USB cable."
        )

    if len(ports) > 1:
        print_ports(ports)
    print(f"Auto-selected serial port {ports[0].device}")
    return ports[0].device


def compact_value(value: Any, decimals: int = 2) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.{decimals}f}"
    return str(value)


def display_json(data: dict[str, Any], raw_json: bool) -> None:
    if raw_json:
        print(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
        return

    record_type = data.get("type")
    if record_type == "startup":
        bus1 = ", ".join(data.get("bus1_addresses", [])) or "none"
        bus2 = ", ".join(data.get("bus2_addresses", [])) or "none"
        print(f"STARTUP | bus 1: {bus1} | bus 2: {bus2}")
        device_keys = (
            "adxl345_ok",
            "mlx90614_ok",
            "ina219_ok",
            "left_tof_ok",
            "right_tof_ok",
            "encoder_ready",
        )
        status = " | ".join(
            f"{key.removesuffix('_ok')}={'OK' if data.get(key) else 'FAIL'}"
            for key in device_keys
        )
        print(status)
        print(
            "Encoder resolution: "
            f"{data.get('pulses_per_revolution')} PPR, "
            f"{data.get('counts_per_revolution')} x4 counts/rev"
        )
        return

    if record_type != "measurement":
        print(json.dumps(data, ensure_ascii=False))
        return

    print(
        f"t={compact_value(data.get('time_ms'), 0)} ms | "
        f"accel=({compact_value(data.get('accel_x'))}, "
        f"{compact_value(data.get('accel_y'))}, "
        f"{compact_value(data.get('accel_z'))}) m/s^2 | "
        f"temp={compact_value(data.get('object_temp'))} C | "
        f"ToF L/R={compact_value(data.get('left_tof_mm'), 0)}/"
        f"{compact_value(data.get('right_tof_mm'), 0)} mm | "
        f"count={compact_value(data.get('encoder_count'), 0)} | "
        f"rpm={compact_value(data.get('encoder_rpm'))} | "
        f"dir={compact_value(data.get('encoder_direction'))}"
    )


class CsvLogger:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.file = None
        self.writer: csv.DictWriter[str] | None = None

    def write(self, data: dict[str, Any]) -> None:
        if data.get("type") != "measurement":
            return

        row = dict(data)
        row.pop("type", None)
        row["host_timestamp_utc"] = datetime.now(timezone.utc).isoformat()

        if self.file is None:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            existed_with_data = self.path.exists() and self.path.stat().st_size > 0

            # Append safely when the existing header matches. For a new file,
            # create a stable header from the preferred fields plus future keys.
            if existed_with_data:
                with self.path.open("r", newline="", encoding="utf-8") as existing:
                    reader = csv.reader(existing)
                    existing_header = next(reader, [])
                if not existing_header:
                    raise RuntimeError(f"Existing CSV has no readable header: {self.path}")
                fieldnames = existing_header
            else:
                future_fields = [key for key in row if key not in PREFERRED_CSV_FIELDS]
                fieldnames = PREFERRED_CSV_FIELDS + sorted(future_fields)

            self.file = self.path.open("a", newline="", encoding="utf-8")
            self.writer = csv.DictWriter(
                self.file, fieldnames=fieldnames, extrasaction="ignore"
            )
            if not existed_with_data:
                self.writer.writeheader()

        assert self.writer is not None
        assert self.file is not None
        self.writer.writerow(row)
        self.file.flush()

    def close(self) -> None:
        if self.file is not None:
            self.file.close()


class ApiForwarder:
    """Forward serial JSON to ConveyorGuard without blocking serial reads."""

    def __init__(self, api_url: str) -> None:
        self.api_url = api_url
        self.pending: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=8)
        self.stop_event = threading.Event()
        self.startup_payload: dict[str, Any] | None = None
        self.startup_delivered = False
        self.connected: bool | None = None
        self.command_lock = threading.Lock()
        self.latest_command: dict[str, Any] | None = None
        self.worker = threading.Thread(target=self._run, daemon=True)
        self.worker.start()

    def submit(self, data: dict[str, Any]) -> None:
        if data.get("type") not in {"startup", "measurement"}:
            return

        if data.get("type") == "startup":
            self.startup_payload = data
            self.startup_delivered = False

        try:
            self.pending.put_nowait(data)
        except queue.Full:
            try:
                self.pending.get_nowait()
                self.pending.task_done()
            except queue.Empty:
                pass
            self.pending.put_nowait(data)

    def _set_command(self, command: dict[str, Any] | None) -> None:
        with self.command_lock:
            self.latest_command = command

    def take_command(self) -> dict[str, Any] | None:
        with self.command_lock:
            command = self.latest_command
            self.latest_command = None
            return command

    def _post(self, data: dict[str, Any]) -> bool:
        payload = json.dumps(data, separators=(",", ":")).encode("utf-8")
        request = Request(
            self.api_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=0.5) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"HTTP {response.status}")
                response_data = json.loads(response.read().decode("utf-8"))
                command = response_data.get("motorCommand")
                if isinstance(command, dict):
                    self._set_command(command)
        except (HTTPError, URLError, OSError, RuntimeError, json.JSONDecodeError) as exc:
            if self.connected is not False:
                print(f"Website bridge offline: {exc}", file=sys.stderr)
            self.connected = False
            self._set_command(
                {
                    "sequence": 0,
                    "emergencyStop": True,
                    "run": False,
                    "speedPercent": 0,
                }
            )
            return False

        if self.connected is not True:
            print(f"Website bridge connected: {self.api_url}", file=sys.stderr)
        self.connected = True
        return True

    def _run(self) -> None:
        while not self.stop_event.is_set() or not self.pending.empty():
            try:
                data = self.pending.get(timeout=0.2)
            except queue.Empty:
                continue

            try:
                if (
                    data.get("type") == "measurement"
                    and self.startup_payload is not None
                    and not self.startup_delivered
                ):
                    self.startup_delivered = self._post(self.startup_payload)

                delivered = self._post(data)
                if data.get("type") == "startup" and delivered:
                    self.startup_delivered = True
            finally:
                self.pending.task_done()

    def close(self) -> None:
        self.stop_event.set()
        self.worker.join(timeout=1.5)


def format_motor_command(command: dict[str, Any] | None) -> bytes:
    if not command:
        return b"CONTROL 0 1 0 0\n"

    sequence = max(0, int(command.get("sequence", 0)))
    emergency_stop = 1 if command.get("emergencyStop", True) else 0
    run = 1 if command.get("run", False) else 0
    speed = max(0, min(100, int(command.get("speedPercent", 0))))
    return f"CONTROL {sequence} {emergency_stop} {run} {speed}\n".encode("ascii")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Display ESP32 conveyor diagnostic readings over USB serial."
    )
    parser.add_argument(
        "--port",
        help="Serial device, for example /dev/cu.usbserial-0001",
    )
    parser.add_argument(
        "--baud",
        type=int,
        default=BAUD_RATE,
        help=f"Serial baud rate (default: {BAUD_RATE})",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List serial ports and exit",
    )
    parser.add_argument(
        "--csv",
        nargs="?",
        const="sensor_log.csv",
        metavar="PATH",
        help="Log JSON measurements to PATH (default: sensor_log.csv)",
    )
    parser.add_argument(
        "--raw-json",
        action="store_true",
        help="Print parsed JSON without the compact live summary",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"ConveyorGuard hardware endpoint (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--no-api",
        action="store_true",
        help="Display/log serial data without sending it to the website backend",
    )
    parser.add_argument(
        "--no-watch",
        action="store_true",
        help="Exit after a missing/disconnected port instead of waiting and reconnecting",
    )
    parser.add_argument(
        "--reconnect-delay",
        type=float,
        default=2.0,
        help="Seconds between automatic serial reconnect attempts (default: 2)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.list:
        print_ports(available_ports())
        return 0

    logger = CsvLogger(Path(args.csv).expanduser()) if args.csv else None
    forwarder = None if args.no_api else ApiForwarder(args.api_url)

    if logger:
        print(f"CSV logging enabled: {logger.path.resolve()}")
        print("CSV rows are written only when the ESP32 uses JSON mode.")
    if forwarder:
        print(f"Website forwarding enabled: {args.api_url}")
    if not args.no_watch:
        print("Serial auto-watch is active. Connect or reconnect the ESP32 at any time.")

    last_error = None

    try:
        while True:
            try:
                port = choose_port(args.port)
                print(f"Opening {port} at {args.baud} baud. Press Ctrl-C to stop.")

                # Opening the port commonly resets an ESP32 development board.
                # A 1 s timeout keeps Ctrl-C responsive during reconnect waits.
                with serial.Serial(
                    port=port,
                    baudrate=args.baud,
                    timeout=1.0,
                ) as connection:
                    last_error = None
                    connection.write(format_motor_command(None))
                    while True:
                        raw = connection.readline()
                        if not raw:
                            continue

                        line = raw.decode("utf-8", errors="replace").strip()
                        if not line:
                            continue

                        try:
                            parsed = json.loads(line)
                        except json.JSONDecodeError:
                            # Bootloader messages and human-readable sketch output
                            # pass through untouched.
                            print(line)
                            continue

                        if not isinstance(parsed, dict):
                            print(line)
                            continue

                        display_json(parsed, args.raw_json)
                        if logger:
                            logger.write(parsed)
                        if forwarder:
                            forwarder.submit(parsed)
                            command = forwarder.take_command()
                            if command is not None:
                                connection.write(format_motor_command(command))

            except (OSError, RuntimeError, SerialException) as exc:
                if args.no_watch:
                    raise

                message = str(exc)
                if message != last_error:
                    print(f"Serial waiting: {message}", file=sys.stderr)
                    print(
                        "Close Arduino Serial Monitor if it owns the port; "
                        "the bridge will retry automatically.",
                        file=sys.stderr,
                    )
                    last_error = message
                time.sleep(max(0.25, args.reconnect_delay))

    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except (OSError, RuntimeError, SerialException) as exc:
        print(f"Serial error: {exc}", file=sys.stderr)
        print(
            "Close Arduino Serial Monitor and any other program using the port, "
            "then reconnect the ESP32 and retry.",
            file=sys.stderr,
        )
        return 1
    finally:
        if logger:
            logger.close()
        if forwarder:
            forwarder.close()


if __name__ == "__main__":
    raise SystemExit(main())
