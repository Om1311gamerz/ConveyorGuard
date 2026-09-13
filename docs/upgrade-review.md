# Engineering audit and upgrade review

Reviewed 13 September 2026. This is a software/provenance review, not industrial validation.

## Checkpoint and scope

The actual repository is the nested `conveyor-guard` folder, initially clean on main at `e31e0d9`. The parent SIH folder has a separate empty Git repository and was left alone. Before edits, all project files except installed/generated runtime caches were copied to a separate checkpoint and a verified full-history Git bundle was created. Existing datasets, training checkpoints, firmware control logic and sensor history were preserved.

The audit covered React routes/components/data flow, Express endpoints, SQLite schema and report contracts, health/alert logic, launch scripts, Python inference/training, dataset/class indices and labels, available weights/training metrics, embedded pins/measurement/control paths, serial reconnection, dependencies and tracked/generated artifacts.

## Findings and corrections

| Before | Correction |
|---|---|
| React-generated random health and misleading Online/Live labels | One backend simulator with explicit provenance; API/ESP32/vision freshness shown independently |
| Threshold copies in UI, simulator and health code | Shared defaults plus validated SQLite configuration |
| React-memory alerts repeated every sample | Persistent source-specific episodes with occurrences, recovery and acknowledgment |
| Reports expected nested camelCase but received flat snake_case | Consistent nested summary/mode/source contract and real JSON export |
| Hardcoded localhost ignored launcher API port | One configured frontend API client |
| Missing values could become zero via `||` and numeric coercion | Nullish aliases preserve valid0; strict sensor validation and unknown values |
| Gravity-inclusive raw acceleration labelled as health vibration | Separate diagnostics and full-window dynamic acceleration RMS in m/s² |
| Floating INA219 sense input interpreted as motor current | Current stays unknown until independently verified setting |
| Unverified ToF/geometry assumptions appeared as calibrated units | Explicit default-false calibration flags and position validity |
| Vision injected fixed sensor readings and fake fused health | Worker submits actual detector results only; backend owns health |
| Working-directory-dependent weights/training/DB paths | Stable script paths, selected model manifest and resolved dataset YAML |
| Latest camera status could persist indefinitely | Actual processed-frame heartbeat expiry; failed capture does not report clear |
| File analysis could imply camera coverage/position | FILE provenance, no physical fusion/position; camera/file heartbeat separation |
| Restart could reuse stale encoder measurement/origin | Startup clears measurement/reference; new tracking session preserves old history without matching a new origin |
| Serial auto-selection could open unrelated first COM device | Only recognized ESP32 candidates automatic; explicit port when needed |
| Destructive history and physical-control paths insufficiently gated | Deletion and actuation default-disabled; loopback/origin/payload validation |
| Template README and missing engineering narrative | Actual architecture/API/hardware/vision/demo documentation, screenshots and status boundaries |

Working motor-state transitions, CONTROL protocol, firmware stop latch/watchdog and relay pin mapping were retained. No physical action was performed. Unused starter graphics/simulator components and four generated label caches were removed from Git; local label cache files remain. Original trained weights/datasets/runs remain available, with future runtime/generated files ignored.

## Verification actually performed

| Check | Result | Scope |
|---|---|---|
| Original build/lint/3 motor-state tests | PASS | Baseline before changes |
| `npm run check` | PASS | Lint, backend syntax,15 tests, production build |
| SQLite migration/restart | PASS |50,425 original readings and all original values retained in migration-copy comparison; actual database still matches checkpoint |
| Rules/source isolation | PASS | NORMAL→WARNING→CRITICAL→recovery, deduplication, acknowledgment, no ESP32/simulator mixing |
| Hardware adapter/freshness tests | PASS | RMS warm-up/reset, gravity removal, unknown current/geometry, signed x4 encoder, session/circular matching |
| Browser navigation | PASS | All seven pages rendered; no console warnings/errors before intentional disconnection |
| Responsive dashboard | PASS |390×844 mobile screenshot; no page overflow; horizontal navigation is deliberately scrollable |
| Settings save/reload | PASS | Changed test threshold persisted; defaults restored in temporary QA database |
| Browser report export | PASS | Actual downloaded JSON parsed; source SIMULATOR and mode counts matched stored report |
| Backend disconnection/reconnection | PASS | Clear error and unknown current values; controls disabled offline; connection recovers |
| Python contracts/imports/compile/pip consistency | PASS | Actual CPython3.12 venv; OpenCV, torch, Ultralytics, serial, yaml, requests |
| Selected dataset inspection | PASS with limitations |84/3/2 images; normalized polygon labels valid; no byte-identical split overlap |
| Training `--dry-run` | PASS | Local paths/labels verified; training not restarted |
| Actual selected-model inference | PASS | One saved test image; three actual boxes posted FILE and persisted |
| Remote GitHub CI | NOT RUN | Workflow prepared locally |
| Firmware compilation/live hardware/live camera | NOT RUN | No Arduino CLI; no serial/camera/actuator access exercised |

A restart test initially failed because belt validity survived startup; the implementation was fixed and all15 tests passed afterward. The in-app automation download-event wait timed out, but the browser did create the expected JSON in Downloads; parsing that actual file verified export. An incorrect shell wildcard used for Python compilation was corrected to directory compilation. These were resolved verification issues, not fabricated passes.

Build output reduced initial JS from the baseline652 kB combined bundle to approximately278 kB, with charts in a separate approximately358 kB lazy chunk (uncompressed). This is bundling evidence, not a measured load-time benchmark.

## Remaining engineering work

The selected validation split has only3 images and omits burnt/puncture/scratch. Saved-image execution does not validate accuracy. Live camera latency, independent evaluation, physical hardware, current ratings/path, alignment baseline, encoder homing/slip and physical E-stop remain unverified. Low-rate RMS does not diagnose bearings. Broad BELT_JOINT_DAMAGE events do not prove physical splice identity.

ACTIVE events remain unresolved after stream loss because disconnect is not a clear observation. Stored report health reflects ingestion thresholds; current health uses current thresholds and fresh camera context. History limits show the latest records, not full cursor pagination. Multi-conveyor physical controllers, authenticated remote deployment, retention policy and production resilience are not implemented.

Team details/problem-statement ID and a project-wide code license require verified team input. No remote repository metadata edit, publication, push, force-push, branch deletion or secret disclosure was performed.
