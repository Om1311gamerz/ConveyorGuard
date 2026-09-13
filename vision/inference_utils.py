def visual_severity(class_name, box_area_ratio):
    """Prototype priority score from class and image area, not damage size."""
    base = {"scratch": 20, "eroded": 35, "punture": 50, "crack": 55, "burnt": 60, "Joint_Damage": 70}.get(class_name, 25)
    return round(min(100, base + min(max(box_area_ratio, 0) * 300, 30)), 1)


def detection_packet(class_name, confidence, box, frame_shape, source, model, belt=None):
    height, width = frame_shape[:2]
    area = max(0, box[2] - box[0]) * max(0, box[3] - box[1]) / (width * height)
    tracked = source == "CAMERA" and belt and belt.get("source") == "ESP32" and belt.get("positionValid") is True
    return {
        "type": class_name, "confidence": round(confidence * 100, 2),
        "severity": visual_severity(class_name, area), "boundingBox": [round(float(n), 2) for n in box],
        "source": source, "model": model,
        "beltPosition": belt.get("beltPositionMeters") if tracked else None,
        "cycle": belt.get("completedBeltCycles") if tracked else None,
        "positionSource": "ESP32" if tracked else None,
    }
