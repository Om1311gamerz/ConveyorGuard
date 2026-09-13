# Computer vision: what actually runs

The implemented worker performs OpenCV capture → YOLO inference → actual boxes/classes/confidences → annotated frame → local API → SQLite/dashboard. The browser Live Feed page provides a separate raw preview; it does not run YOLO or draw detections on unrelated preview frames.

## Checkpoints and provenance

Default deployment checkpoint: `vision/models/beltguard-yolo11n.pt`, copied from the existing `vision/runs/detect/runs/detect/train_v2-2/weights/best.pt`. The original weights, base `vision/yolo11n.pt`, earlier four-class checkpoint and training artifacts were preserved. `models/manifest.json` records the exact selected checkpoint hash and source. Future generated runs are ignored; retained original tracked artifacts remain available as provenance.

The selected model is YOLO11n detection with these exact indices:

| Index | Model class | Interpretation |
|---|---|---|
| 0 | `Joint_Damage` | Dataset joint-damage category |
| 1 | `burnt` | Burn-like visual marking |
| 2 | `crack` | Crack category |
| 3 | `eroded` | Erosion category |
| 4 | `punture` | Original dataset spelling for puncture; preserved to retain indices |
| 5 | `scratch` | Scratch category |

A class name is a detector prediction, not a verified damage diagnosis. Confidence is the model's score, not an empirical accuracy percentage. The API stores confidence on a0–100 scale; Ultralytics supplies a0–1 score.

## Dataset audit

Default dataset YAML: `vision/dataset_v2/BeltGuard-Damage-Detection.v1i.yolov11/data.yaml`. The legacy four-class export and duplicate six-class root export remain in the repository; they are not silently merged into the selected split.

| Split | Images | Polygon instances | Missing represented classes |
|---|---:|---:|---|
| Train | 84 (3 negative images) | 234 | None |
| Validation | 3 | 6 | `burnt`, `punture`, `scratch` |
| Test | 2 | 10 | `Joint_Damage`, `scratch` |

The selected export contains normalized polygon labels, not just five-value boxes. The validator accepts both normalized boxes and polygons, checks class indices/ranges/area, resolves old `../train` export paths, and compares exact image hashes across splits. The audited split has no invalid labels and no byte-identical cross-split images. This does not prove capture-session independence or rule out visually related/augmented leakage. Labels and tiny evaluation splits still need expert review.

Ultralytics' local loader converts polygon segments to boxes for this detection task. See the official [dataset documentation](https://docs.ultralytics.com/datasets/detect/) and [prediction documentation](https://docs.ultralytics.com/modes/predict/) for underlying formats and inference options.

The original100-epoch run's last `results.csv` row reports precision0.5289, recall0.49169, mAP50=0.57167 and mAP50–95=0.32283 on only three validation images. These are historical training metrics, not an independent benchmark, six-class validation, industrial performance, or a headline accuracy claim. A fresh training run and independent evaluation were not performed in this review.

## Reproducible setup

Use Python3.12 and a virtual environment. On Windows, use a regular CPython installation rather than an unrelated MSYS Python with no pip:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r vision/requirements.txt -r hardware/requirements.txt
python -m pip check
```

On Linux/macOS activate with `source .venv/bin/activate`. The CPU build was sufficient for the saved-image smoke test. Requirements give compatible version ranges; they are not a complete lockfile. `runtime_setup.py` keeps Ultralytics/Matplotlib settings in ignored project caches.

Validate and review training inputs without spending training time:

```bash
python vision/check_dataset.py
python vision/train_model.py --dry-run
python -m unittest discover -s vision -p "test_*.py"
```

Training is an explicit separate action:

```bash
python vision/train_model.py --epochs 100 --imgsz 640 --device cpu --name conveyorguard
```

The script verifies local paths/labels, rejects exact cross-split duplicates, writes a resolved absolute YAML under ignored `vision/runs/`, and trains the existing architecture. GPU device selection is optional if a compatible PyTorch installation and GPU are available. Do not claim improvement until independent evaluation supports it.

## Actual inference

With `npm run system` or `npm run demo` running:

```powershell
# Existing saved image, actual predictions, no camera or actuator access:
$sample = (Get-ChildItem 'vision/dataset_v2/BeltGuard-Damage-Detection.v1i.yolov11/test/images' -File | Select-Object -First 1).FullName
python vision/camera_test.py --source "$sample" --headless --max-frames 1 --output vision/runs/smoke-test.jpg

# Intentional camera use only; browser preview should be stopped first:
python vision/camera_test.py --source 0

# Local video/image analysis without any API writes:
python vision/camera_test.py --source PATH_TO_LOCAL_FILE --no-api --headless
```

Use `--api-url http://127.0.0.1:PORT` when the launcher selects another port. Default inference is CPU, confidence0.50 and image size416. `--model`, `--conf`, `--imgsz`, `--device`, `--max-frames` and `--output` are supported; `--source` is required. Press q in the annotation window or Ctrl+C to stop.

The worker posts every actual box from a selected frame at most once per second, storing class, xyxy pixel bounding box, confidence, server timestamp, model name and source. A genuinely processed frame with no boxes posts a clear heartbeat. Failed/end-of-input capture does not post a healthy result; coverage expires. Local images/videos use FILE provenance and do not affect physical health. The latest card represents the last box, while `/api/vision/detections` retains individual observations.

Priority is a separate explicit heuristic: class base (`scratch20`, `eroded35`, `punture50`, `crack55`, `burnt60`, `Joint_Damage70`) plus image box-area contribution capped at30; total capped at100. It is not measured defect size or remaining life. It does not reuse confidence as severity.

## Position association and observed test

CAMERA detections can include the latest fresh calibrated ESP32 relative position and signed cycle. FILE results have no belt position. Defect IDs group same-class positions within circular tolerance; synchronization, physical homing and robust object tracking are still absent. Restarts/calibration changes start a new session rather than rematching old relative origins.

The saved-image smoke test loaded the actual six-class checkpoint and processed one test image, producing three real detector boxes that were successfully posted as FILE and persisted. The annotated image in the completion outputs is evidence of execution only. It is not an evaluation, and no live camera or physical belt inspection was performed.

Next work: collect diverse independent belts/capture sessions/lighting/load conditions, add evaluation examples for every class, review labels, compare false-positive/false-negative rates, establish target inference latency, and validate geometry/time alignment on the physical prototype.
