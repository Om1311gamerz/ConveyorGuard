"""Real OpenCV + YOLO inference; sensor fusion belongs to the backend."""
import argparse
import logging
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from inference_utils import detection_packet

ROOT = Path(__file__).resolve().parent
LOG = logging.getLogger("conveyorguard.vision")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Local camera index (0), image, or video path")
    parser.add_argument("--model", type=Path, default=ROOT / "models/beltguard-yolo11n.pt")
    parser.add_argument("--api-url", default=os.getenv("CONVEYORGUARD_API_URL", "http://127.0.0.1:5000"))
    parser.add_argument("--no-api", action="store_true", help="Run inference locally without posting results")
    parser.add_argument("--conf", type=float, default=0.50)
    parser.add_argument("--imgsz", type=int, default=416)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max-frames", type=int, default=0, help="Stop after N frames; 0 is unlimited")
    parser.add_argument("--output", type=Path, help="Save the last real annotated frame")
    args = parser.parse_args()
    if not 0 < args.conf <= 1 or args.imgsz < 32 or args.max_frames < 0:
        parser.error("Invalid confidence, image size or frame limit")
    return args


def main():
    args = parse_args()
    from runtime_setup import setup_runtime
    setup_runtime()
    try:
        import cv2
        import requests
        from ultralytics import YOLO
    except ImportError as error:
        LOG.error("Missing vision dependency: %s. Install vision/requirements.txt in a supported Python venv.", error)
        return 2
    if not args.model.is_file():
        LOG.error("Model weights not found: %s", args.model)
        return 2
    source = int(args.source) if args.source.isdigit() else str(Path(args.source).resolve())
    source_kind = "CAMERA" if isinstance(source, int) else "FILE"
    if source_kind == "FILE" and not Path(source).is_file():
        LOG.error("Local input file not found: %s", source)
        return 2
    base = args.api_url.rstrip("/")
    if urlparse(base).hostname not in {"127.0.0.1", "localhost"}:
        LOG.error("Use a local ConveyorGuard API URL.")
        return 2
    model = YOLO(str(args.model.resolve()))
    LOG.info("Loaded %s; classes: %s", args.model.name, model.names)
    session = requests.Session()
    capture = None
    last_post = 0
    frame_count = 0
    detection_count = 0
    last_annotated = None
    is_image = source_kind == "FILE" and Path(source).suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"}
    if not is_image:
        capture = cv2.VideoCapture(source, cv2.CAP_DSHOW if source_kind == "CAMERA" and os.name == "nt" else cv2.CAP_ANY)
        if not capture.isOpened():
            LOG.error("Input unavailable; camera coverage remains unknown.")
            capture.release()
            session.close()
            return 3
    try:
        while True:
            if is_image:
                frame = cv2.imread(source)
                ok = frame is not None
            else:
                ok, frame = capture.read()
            if not ok:
                LOG.warning("Input ended or disconnected. No fabricated clear/healthy observation is sent.")
                break
            result = model.predict(frame, conf=args.conf, imgsz=args.imgsz, device=args.device, verbose=False)[0]
            frame_count += 1
            last_annotated = result.plot()
            now = time.monotonic()
            if not args.no_api and (is_image or now - last_post >= 1):
                belt = None
                try:
                    if source_kind == "CAMERA":
                        response = session.get(base + "/api/belt/status?source=ESP32", timeout=0.5)
                        response.raise_for_status()
                        belt = response.json()
                    packets = []
                    for box in result.boxes:
                        packet = detection_packet(model.names[int(box.cls[0])], float(box.conf[0]), box.xyxy[0].tolist(), frame.shape, source_kind, args.model.name, belt)
                        packets.append(packet)
                        response = session.post(base + "/api/vision/detection", json=packet, timeout=1)
                        response.raise_for_status()
                    if not packets:
                        response = session.post(base + "/api/vision/clear", json={"source": source_kind}, timeout=1)
                        response.raise_for_status()
                    LOG.info("Frame %d: %d real detector boxes posted (%s)", frame_count, len(packets), source_kind)
                except (requests.RequestException, ValueError) as error:
                    LOG.warning("API unavailable or rejected a result: %s", error)
                last_post = now
            detection_count += len(result.boxes)
            if not args.headless:
                cv2.imshow("ConveyorGuard - " + source_kind + " - actual YOLO boxes", last_annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            if is_image or args.max_frames and frame_count >= args.max_frames:
                break
    except KeyboardInterrupt:
        LOG.info("Inference stopped by operator.")
    finally:
        if capture is not None:
            capture.release()
        if not args.headless:
            cv2.destroyAllWindows()
        session.close()
    if args.output and last_annotated is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(args.output), last_annotated):
            LOG.error("Could not save annotated frame.")
            return 4
    LOG.info("Processed %d real frames; %d detector boxes. No model-accuracy claim is inferred.", frame_count, detection_count)
    return 0 if frame_count else 3


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    raise SystemExit(main())
