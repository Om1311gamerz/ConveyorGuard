"""Resolve local YOLO datasets without machine-specific paths or downloads."""
import hashlib
import math
from pathlib import Path
import yaml


def inspect_dataset(config_path):
    config_path = Path(config_path).resolve()
    data = yaml.safe_load(config_path.read_text(encoding="utf-8-sig"))
    root = config_path.parent
    names = data["names"]
    if isinstance(names, dict):
        names = [names[i] for i in range(len(names))]
    if data.get("nc", len(names)) != len(names):
        raise ValueError("nc does not match names")
    stats, errors, hashes = {}, [], {}
    for split in ("train", "val", "test"):
        if split not in data:
            continue
        # The supplied Roboflow exports used ../train although their images are
        # alongside data.yaml. Normalize that export convention explicitly.
        relative = data[split].removeprefix("../")
        directory = (root / relative).resolve()
        if not directory.is_dir():
            raise ValueError(f"Missing {split} images: {directory}")
        images = sorted(p for p in directory.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"})
        counts = [0] * len(names)
        formats = {"boxes": 0, "polygons": 0}
        negatives = 0
        for image in images:
            digest = hashlib.sha256(image.read_bytes()).hexdigest()
            hashes.setdefault(digest, set()).add(split)
            label = directory.parent / "labels" / (image.stem + ".txt")
            lines = label.read_text().splitlines() if label.exists() else []
            if not lines:
                negatives += 1
            for line in lines:
                try:
                    values = [float(v) for v in line.split()]
                    is_box = len(values) == 5
                    is_polygon = len(values) >= 7 and len(values) % 2 == 1
                    if not (is_box or is_polygon) or not values[0].is_integer() or not 0 <= values[0] < len(names) or not all(math.isfinite(v) and 0 <= v <= 1 for v in values[1:]):
                        raise ValueError("invalid class or normalized box")
                    if is_box and (values[3] <= 0 or values[4] <= 0):
                        raise ValueError("box has zero area")
                    if is_polygon and (max(values[1::2]) <= min(values[1::2]) or max(values[2::2]) <= min(values[2::2])):
                        raise ValueError("polygon has zero bounding-box area")
                    counts[int(values[0])] += 1
                    formats["boxes" if is_box else "polygons"] += 1
                except ValueError as error:
                    errors.append(f"{label.name}: {error}")
        stats[split] = {"images": len(images), "negativeImages": negatives, "instancesPerClass": dict(zip(names, counts)), "labelFormats": formats}
        data[split] = relative
    data["path"] = str(root)
    return data, {"classes": names, "splits": stats, "invalidLabels": errors, "identicalImagesAcrossSplits": sum(len(splits) > 1 for splits in hashes.values())}
