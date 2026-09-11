import cv2
import time
import requests

from ultralytics import YOLO


# ==================================================
# URLS
# ==================================================

HEALTH_URL = (
    "http://localhost:5000/api/health"
)

BELT_URL = (
    "http://localhost:5000/api/belt/status"
)

VISION_URL = (
    "http://localhost:5000/api/vision/detection"
)

VISION_CLEAR_URL = (
    "http://localhost:5000/api/vision/clear"
)


# ==================================================
# MODEL
# ==================================================

MODEL_PATH = (
 r"runs\detect\runs\detect\train_v2-2\weights\best.pt"
    
)


model = YOLO(MODEL_PATH)
print("==========================================")
print("YOLO MODEL LOADED:", model.ckpt_path)
print("MODEL CLASSES:", model.names)
print("==========================================")


# ==================================================
# HTTP SESSION
# ==================================================

session = requests.Session()


# ==================================================
# CAMERA
# ==================================================

cap = cv2.VideoCapture(
    0,
    cv2.CAP_DSHOW
)

cap.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    640
)

cap.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    480
)


if not cap.isOpened():
    print("Could not open camera.")
    raise SystemExit


print("BeltGuard AI running")
print("Press Q to quit")


# ==================================================
# TEMPORARY SENSOR VALUES
# ==================================================

vibration_value = 30.0

temperature_value = 32.0

misalignment_value = 1.0

motor_load_value = 35.0


# ==================================================
# BELT DATA CACHE
# ==================================================

belt_position = None

completed_cycles = 0

roller_rpm = 0

belt_cycles_per_minute = 0


# ==================================================
# HEALTH CACHE
# ==================================================

health_score = 100.0

health_condition = "HEALTHY"


# ==================================================
# DEFECT CACHE
# ==================================================

current_defect_id = None

current_defect_type = None

current_confidence = 0.0

current_severity = 0.0


# ==================================================
# TIMERS
# ==================================================

last_belt_update = 0.0

last_health_send = 0.0

last_vision_send = 0.0


BELT_UPDATE_INTERVAL = 0.5

HEALTH_SEND_INTERVAL = 1.0

VISION_SEND_INTERVAL = 1.0


# ==================================================
# VISUAL SEVERITY
# ==================================================

def calculate_visual_severity(
    defect_name,
    confidence,
    box_area_ratio
):

    base_severity = {
        "scratch": 20,
        "eroded": 35,
        "crack": 55,
        "Joint_Damage": 70,
    }

    base = float(
        base_severity.get(
            defect_name,
            25
        )
    )

    size_score = min(
        float(box_area_ratio)
        * 300.0,
        30.0
    )

    confidence_score = (
        float(confidence)
        * 10.0
    )

    severity = (
        base
        + size_score
        + confidence_score
    )

    return float(
        min(
            round(
                severity,
                1
            ),
            100.0
        )
    )


# ==================================================
# LOOP
# ==================================================

while True:

    ret, frame = cap.read()

    if not ret:
        break


    now = time.time()


    # ==================================================
    # GET BELT DATA
    # ==================================================

    if (
        now - last_belt_update
        >= BELT_UPDATE_INTERVAL
    ):

        try:

            response = session.get(
                BELT_URL,
                timeout=0.15
            )

            if response.ok:

                belt = response.json()

                belt_position = belt.get(
                    "beltPositionMeters"
                )

                completed_cycles = int(
                    belt.get(
                        "completedBeltCycles",
                        0
                    )
                )

                roller_rpm = float(
                    belt.get(
                        "rollerRPM",
                        0
                    )
                )

                belt_cycles_per_minute = float(
                    belt.get(
                        "beltCyclesPerMinute",
                        0
                    )
                )

        except requests.RequestException:
            pass


        last_belt_update = now


    # ==================================================
    # YOLO
    # ==================================================

    results = model(
        frame,
        conf=0.50,
        imgsz=416,
        verbose=False
    )


    result = results[0]


    annotated_frame = result.plot()


    height, width = (
        frame.shape[:2]
    )


    frame_area = float(
        width * height
    )


    strongest_defect = None

    strongest_severity = 0.0


    # ==================================================
    # PROCESS DETECTIONS
    # ==================================================

    if (
        result.boxes is not None
        and len(result.boxes) > 0
    ):

        for box in result.boxes:

            class_id = int(
                box.cls[0].item()
            )


            defect_name = str(
                model.names[
                    class_id
                ]
            )


            confidence = float(
                box.conf[0].item()
            )


            coords = (
                box.xyxy[0]
                .cpu()
                .numpy()
                .tolist()
            )


            x1, y1, x2, y2 = (
                coords
            )


            box_width = max(
                0.0,
                float(x2) -
                float(x1)
            )


            box_height = max(
                0.0,
                float(y2) -
                float(y1)
            )


            box_area = (
                box_width *
                box_height
            )


            box_area_ratio = (
                box_area /
                frame_area
            )


            severity = (
                calculate_visual_severity(
                    defect_name,
                    confidence,
                    box_area_ratio
                )
            )


            if (
                severity >
                strongest_severity
            ):

                strongest_severity = (
                    severity
                )

                strongest_defect = {
                    "type":
                        defect_name,

                    "confidence":
                        float(
                            round(
                                confidence
                                * 100,
                                1
                            )
                        ),

                    "severity":
                        float(
                            severity
                        ),
                }


    # ==================================================
    # SEND VISION STATUS
    # ==================================================

    if (
        now - last_vision_send
        >= VISION_SEND_INTERVAL
    ):

        if (
            strongest_defect
            is not None
            and
            belt_position
            is not None
        ):

            payload = {
                "type":
                    str(
                        strongest_defect[
                            "type"
                        ]
                    ),

                "confidence":
                    float(
                        strongest_defect[
                            "confidence"
                        ]
                    ),

                "severity":
                    float(
                        strongest_defect[
                            "severity"
                        ]
                    ),

                "beltPosition":
                    float(
                        belt_position
                    ),

                "cycle":
                    int(
                        completed_cycles
                    ),
            }


            try:

                response = (
                    session.post(
                        VISION_URL,
                        json=payload,
                        timeout=0.2
                    )
                )


                if response.ok:

                    tracked = (
                        response.json()
                    )


                    defect = (
                        tracked.get(
                            "defect",
                            {}
                        )
                    )


                    current_defect_id = (
                        defect.get(
                            "id"
                        )
                    )


                    current_defect_type = (
                        strongest_defect[
                            "type"
                        ]
                    )


                    current_confidence = (
                        strongest_defect[
                            "confidence"
                        ]
                    )


                    current_severity = (
                        strongest_defect[
                            "severity"
                        ]
                    )


            except requests.RequestException:
                pass


        else:

            try:

                session.post(
                    VISION_CLEAR_URL,

                    json={
                        "beltPosition":
                            belt_position,

                        "cycle":
                            int(
                                completed_cycles
                            ),
                    },

                    timeout=0.2
                )

            except requests.RequestException:
                pass


            current_defect_id = None

            current_defect_type = None

            current_confidence = 0.0

            current_severity = 0.0


        last_vision_send = now


    # ==================================================
    # SEND HEALTH
    # ==================================================

    if (
        now - last_health_send
        >= HEALTH_SEND_INTERVAL
    ):

        health_payload = {
            "visualDamage":
                float(
                    strongest_severity
                ),

            "vibration":
                float(
                    vibration_value
                ),

            "temperature":
                float(
                    temperature_value
                ),

            "misalignment":
                float(
                    misalignment_value
                ),

            "motorLoad":
                float(
                    motor_load_value
                ),
        }


        try:

            response = session.post(
                HEALTH_URL,
                json=health_payload,
                timeout=0.2
            )


            if response.ok:

                health = (
                    response.json()
                )


                health_score = float(
                    health.get(
                        "healthScore",
                        100
                    )
                )


                health_condition = str(
                    health.get(
                        "condition",
                        "HEALTHY"
                    )
                )


        except requests.RequestException:
            pass


        last_health_send = now


    # ==================================================
    # CAMERA OVERLAY
    # ==================================================

    cv2.putText(
        annotated_frame,
        f"Cycle: {completed_cycles}",
        (15, 25),

        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,

        (0, 255, 0),
        2
    )


    cv2.putText(
        annotated_frame,
        f"Position: {belt_position} m",
        (15, 50),

        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,

        (0, 255, 0),
        2
    )


    cv2.putText(
        annotated_frame,
        f"Health: {health_score}",
        (15, 75),

        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,

        (0, 255, 255),
        2
    )


    cv2.putText(
        annotated_frame,
        f"Status: {health_condition}",
        (15, 100),

        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,

        (0, 255, 255),
        2
    )


    if current_defect_type:

        cv2.putText(
            annotated_frame,

            (
                f"{current_defect_id} | "
                f"{current_defect_type} | "
                f"{current_confidence}%"
            ),

            (15, 125),

            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,

            (0, 0, 255),
            2
        )


    # ==================================================
    # SHOW
    # ==================================================

    cv2.imshow(
        "BeltGuard AI - Damage Detection",
        annotated_frame
    )


    if (
        cv2.waitKey(1)
        & 0xFF
        == ord("q")
    ):
        break


# ==================================================
# CLEANUP
# ==================================================

cap.release()

cv2.destroyAllWindows()

session.close()

print("BeltGuard AI stopped.")