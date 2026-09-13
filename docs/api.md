# Implemented REST API

Default base `http://127.0.0.1:5000`. The launcher prints the actual selected port. JSON requests use `Content-Type: application/json`; body limit64 KiB. The backend binds loopback and accepts local HTTP dashboard origins. There is no remote authentication service.

Server timestamps are ISO8601 UTC for new events/readings. Existing rows retain original timestamps/values. Missing measurements are null, never fabricated0. Errors use JSON `{ "error": "..." }` (some include `success:false` or motor state):400 invalid payload/query,403 disabled action/untrusted origin,404 missing route/resource,409 motor-state conflict,413 oversized JSON,500 generic internal error.

## System, configuration and demo

| Method/path | Implemented behaviour |
|---|---|
| `GET /` | Name, backend status, version |
| `GET /api/status` | Database probe, backend/mode and physical stream freshness |
| `GET /api/beltguard/status` | Dashboard snapshot: config, selected sensor, computed health, raw hardware, motor, encoder, latest vision, defects, active alerts |
| `GET /api/config` | Shared thresholds/hardware/freshness defaults or persisted configuration |
| `PUT /api/config` | Merge partial `thresholds` and/or `hardware`, validate and persist; hardware changes reset encoder/RMS reference and tracking session |
| `POST /api/demo` | `{ "enabled":true, "mode":"NORMAL" }`; allowed modes NORMAL/WARNING/CRITICAL; enabled false selects hardware and resolves simulator episodes |

Selected-source endpoints default to SIMULATOR in simulation and ESP32 otherwise. `?source=ESP32|SIMULATOR|UNKNOWN` explicitly selects a sensor source. The aggregated dashboard/health are for CB-01; general ingestion/history support conveyor IDs, but independent controllers for multiple conveyors are not implemented. `visionConnected` is fresh CAMERA coverage, whereas the latest `vision` card may be FILE analysis.

Config keys are exactly those in `config/defaults.json`; unknown section keys, nonfinite values, invalid threshold ordering and invalid geometry are rejected. Critical must exceed a positive warning value. Validity flags must be booleans. Runtime freshness values are supplied by shared defaults, not editable through PUT. No deletion or historical score rewrite occurs when settings change.

## Sensor ingestion, history and health

| Method/path | Implemented behaviour |
|---|---|
| `POST /api/sensor-data` | Validate measured units, timestamp server-side, persist row + health + alert reconciliation transaction |
| `GET /api/sensor-data/latest` | Latest selected-source row or null |
| `GET /api/sensor-data` | Newest-first persisted rows with explicit optional filters |
| `DELETE /api/sensor-data` | Disabled by default; requires `ALLOW_HISTORY_DELETE=true` and `?confirm=DELETE`; optional source/conveyor/date filters |
| `POST /api/health` | Stateless measured-value preview, `persisted:false`; does not store rows or generate alerts |
| `GET /api/health/latest` | Recompute selected CB-01 reading with current thresholds/fresh camera; includes sample age/stale |
| `GET /api/reports/summary` | Persisted aggregates, recorded modes, source breakdown, units/scope and legacy warning |

Illustrative sensor contract (not actual hardware evidence):

```json
{
  "conveyorId":"CB-01", "source":"ESP32",
  "vibration":0.3, "temperature":31.2, "motorCurrent":null,
  "beltSpeed":null, "alignment":null, "alignmentLeft":143,
  "alignmentRight":147, "beltPosition":null, "rpm":15,
  "emergencyStop":true
}
```

Units: vibration dynamic acceleration RMS m/s²; temperature°C; currentA; speedm/s; alignmentmm; positionm; RPM signed. Source defaults UNKNOWN if omitted. SIMULATOR requires enabled simulation and `simulationMode` NORMAL/WARNING/CRITICAL. At least one of the five health measurements must be present. Numeric strings/booleans/negative unsigned metrics are rejected. `motor_current`/`belt_speed` aliases are accepted and take precedence over camelCase with nullish fallback, retaining valid zero. Older normalized motorLoad/risk packets are not current measured-unit contracts.

POST returns `{success,id,reading,health}`. History rows retain SQLite snake_case names, plus decoded `health` and `emergencyStop`. Health includes `healthScore`, `condition`, `method:PROTOTYPE_HEURISTIC`, measured `signals`, per-factor `risks`, `faults`, `dataQuality` and explanation. See [architecture](architecture.md) for the exact formula and rules. Freshness must be inspected separately from a stored historical condition.

History, report and alert filters: `source`, `conveyorId`, `from`, `to`; dates must parse to ISO UTC. History/alerts support `limit` integer1–1000 (default100). History/report without source intentionally query all sources; the dashboard supplies a source. Source filter supports ESP32/SIMULATOR/UNKNOWN/CAMERA/FILE; camera/file generally have no sensor rows. Queries use parameters. There is no cursor pagination; limit returns the latest records.

Report shape:

```json
{
  "summary":{"totalReadings":0,"avgVibration":null,"maxVibration":null,"avgTemperature":null,"maxTemperature":null,"avgMotorCurrent":null,"maxMotorCurrent":null,"avgAlignment":null,"maxAlignment":null,"avgHealth":null,"lowestHealth":null,"firstReading":null,"latestReading":null},
  "operatingModes":[], "sourceBreakdown":[],
  "scope":{"source":"ALL","conveyorId":"ALL","from":null,"to":null},
  "method":"PROTOTYPE_HEURISTIC"
}
```

Responses additionally include unit metadata and `legacyWarning`. Aggregate averages ignore nulls; each metric can have a different number of valid samples. UNKNOWN legacy vibration cannot be safely combined with new RMS values for interpretation.

## Persistent alerts

| Method/path | Implemented behaviour |
|---|---|
| `GET /api/alerts` | Newest-first persistent episodes; optional filters above plus `status=ACTIVE|RESOLVED` |
| `POST /api/alerts/:id/acknowledge` | Record first acknowledgment timestamp; idempotent,404 if missing |

Each event includes ID, source/conveyor, `fault_type`, severity, explanation/recommendation, contributingSignals, first/updated/resolved/acknowledged timestamps, status and occurrences. Repeated samples increment occurrences, not a new episode. Severity changes close the old episode and open the new severity. A clear/recovered observation resolves an event; unplugging hardware/camera does not establish recovery. There is no API deleting alert history.

## Serial, encoder and supplementary motor state

| Method/path | Implemented behaviour |
|---|---|
| `POST /api/hardware/serial` | Raw startup/measurement JSON; metadata ESP32/CB-01 if supplied; normalized storage throttled1 s; reply includes stopped/run motor command |
| `GET /api/hardware/latest` | Sanitized startup/measurement, 600 ms connection window, timestamps |
| `POST /api/belt/pulses` | Positive integer `pulses`, optional source defaultUNKNOWN; SIMULATOR needs enabled demo; separate source tracker |
| `GET /api/belt/status` | Source tracker freshness, signedRPM/cycles, position and geometry validity |
| `GET /api/motor/status` | Backend latch/armed/running/target state, enabled flag, fresh firmware telemetry |
| `POST /api/motor/stop` | Always available stopped command |
| `POST /api/motor/emergency-stop` | Always available software latched-stop command |
| `POST /api/motor/reset` | Disabled by default; compatibility/state gates when enabled |
| `POST /api/motor/arm` | Disabled by default; explicit stopped reset before arming |
| `POST /api/motor/speed` | Disabled by default; `{ "speedPercent":0 }` validated0–100 |
| `POST /api/motor/start` | Disabled by default; requires prior explicit reset/arm/speed and live compatible telemetry |

`ALLOW_MOTOR_CONTROL=false` is default; all actuation-related routes remain rejected in simulation. Software tests exercise state transitions without serial devices. ESP32 physical position/metres are null when geometry is unverified and position invalid when either encoder or hardware heartbeat is stale. A CONTROL reply is supplementary software control, not a physical E-stop.

## Actual visual observations

| Method/path | Implemented behaviour |
|---|---|
| `POST /api/vision/detection` | Validate/store actual detector metadata; optionally associate fresh calibrated CAMERA position |
| `POST /api/vision/clear` | `{ "source":"CAMERA" }` only after a genuine processed frame with no detections; source-specific alert recovery/heartbeat |
| `GET /api/vision/latest` | Latest source observation with5 s freshness; no fabricated boot state |
| `GET /api/vision/detections` | Persisted individual boxes newest-first, optional limit |
| `GET /api/vision/defects` | Persisted Dxx position-associated groups, including previous sessions |
| `GET /api/vision/defects/:id` | One group or404 |
| `DELETE /api/vision/defects` | Disabled by default; same explicit deletion guard; clears groups, not individual detection history |

Detection input: nonempty `type` up to64 characters; confidence percentage0–100; separate heuristic severity0–100; sourceCAMERA/FILE/UNKNOWN (defaultUNKNOWN); optional model name, boundingBox `[x1,y1,x2,y2]` finite nonnegative ordered pixel coordinates; optional beltPosition0–loop-length, signed integercycle, and positionSourceESP32. Server timestamp is ingestion time, not a synchronized capture timestamp.

Tracking is accepted only for CAMERA + positionSourceESP32 + valid current calibrated ESP32 tracker + both position/cycle. Otherwise positions remain null. Result `{isNewDefect,defect,positionTracked,vision}`; tracked groups include trackingSession, timesSeen/latest/max priority and capped per-cycle history (latest200 entries). No physical homing, multi-object tracking, frame synchronization, photo-upload endpoint, or remote camera URL support exists.
