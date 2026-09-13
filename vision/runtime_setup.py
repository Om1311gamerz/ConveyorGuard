"""Keep optional library settings and caches inside this project."""
import os
import sys
from pathlib import Path


def setup_runtime():
    root = Path(__file__).resolve().parent.parent
    config = Path(os.environ.setdefault("YOLO_CONFIG_DIR", str(root / ".yolo-cache")))
    (config / "Ultralytics").mkdir(parents=True, exist_ok=True)
    cache = Path(os.environ.setdefault("MPLCONFIGDIR", str(root / ".matplotlib-cache")))
    cache.mkdir(parents=True, exist_ok=True)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
