from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
   data=r"C:\Users\Om_13\Downloads\SIH\conveyor-guard\vision\dataset_v2\BeltGuard-Damage-Detection.v1i.yolov11\data.yaml",
    epochs=100,
    imgsz=640,
    device="cpu",
    project="runs/detect",
    name="train_v2"
)