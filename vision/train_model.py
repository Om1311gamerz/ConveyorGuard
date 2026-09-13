"""Train the existing YOLO11n architecture on a verified local dataset."""
import argparse
import json
from pathlib import Path
from dataset_tools import inspect_dataset

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "dataset_v2/BeltGuard-Damage-Detection.v1i.yolov11/data.yaml")
    parser.add_argument("--weights", type=Path, default=ROOT / "yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--name", default="conveyorguard")
    parser.add_argument("--dry-run", action="store_true", help="Validate paths and labels without training")
    args = parser.parse_args()
    data, report = inspect_dataset(args.data)
    if report["invalidLabels"]:
        raise ValueError("Dataset labels failed validation: " + json.dumps(report["invalidLabels"]))
    if report["identicalImagesAcrossSplits"]:
        raise ValueError("Identical images cross dataset splits. Repair the split before training.")
    if not args.weights.is_file():
        raise FileNotFoundError(args.weights)
    if args.epochs < 1 or args.imgsz < 32:
        raise ValueError("epochs must be positive and imgsz must be at least 32")
    print(json.dumps({"dataset": report, "weights": str(args.weights.resolve()), "epochs": args.epochs, "device": args.device, "training": not args.dry_run}, indent=2))
    if args.dry_run:
        return 0
    from runtime_setup import setup_runtime
    setup_runtime()
    import yaml
    from ultralytics import YOLO
    runs = ROOT / "runs"
    runs.mkdir(exist_ok=True)
    resolved = runs / "resolved-data.yaml"
    resolved.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    model = YOLO(str(args.weights.resolve()))
    model.train(data=str(resolved), epochs=args.epochs, imgsz=args.imgsz, device=args.device, project=str(runs / "detect"), name=args.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
