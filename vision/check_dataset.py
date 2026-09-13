import argparse
import json
from pathlib import Path
from dataset_tools import inspect_dataset


def main():
    parser = argparse.ArgumentParser(description="Validate existing local conveyor datasets; no training or downloading.")
    parser.add_argument("--data", type=Path, default=Path(__file__).parent / "dataset_v2/BeltGuard-Damage-Detection.v1i.yolov11/data.yaml")
    args = parser.parse_args()
    _, report = inspect_dataset(args.data)
    print(json.dumps(report, indent=2))
    return 1 if report["invalidLabels"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
