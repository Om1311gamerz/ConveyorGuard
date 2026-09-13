<div align="center">

# 🏭 ConveyorGuard

### AI-Powered Intelligent Conveyor Belt Health Monitoring System

**Detect Early • Monitor Continuously • Maintain Intelligently**

<br>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-Computer%20Vision-3776AB?style=for-the-badge&logo=python&logoColor=white)
![YOLO](https://img.shields.io/badge/YOLO-Object%20Detection-111F68?style=for-the-badge)
![OpenCV](https://img.shields.io/badge/OpenCV-Vision-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-IoT-E7352C?style=for-the-badge&logo=espressif&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

<br>

**A multimodal predictive-maintenance prototype combining AI computer vision, IoT sensors, encoder-based belt tracking, real-time analytics, and condition monitoring for conveyor systems.**

<br>

`Computer Vision` • `IoT` • `Predictive Maintenance` • `Industrial AI` • `Embedded Systems` • `Full-Stack`

</div>

---

## 🚀 Overview

**ConveyorGuard** is an intelligent conveyor-belt condition-monitoring prototype developed for industrial and mining environments.

Instead of monitoring a conveyor through a single parameter, ConveyorGuard combines **visual inspection and physical sensor data** to build a more complete picture of conveyor health.

The system integrates:

- 🤖 **YOLO + OpenCV** for visual belt-defect detection
- 📳 **ADXL345** for vibration monitoring
- 🌡️ **MLX90614** for non-contact temperature monitoring
- ↔️ **Distance / ToF sensors** for belt-alignment monitoring
- ⚡ **INA219** for electrical measurements
- 🔄 **Rotary encoder** for speed, movement and belt-position tracking
- 🧠 **Health-analysis logic** for condition assessment
- 💾 **Node.js + SQLite** for data processing and historical storage
- 📊 **React dashboard** for real-time monitoring, analytics and alerts

> **Project Status:** 🚧 Engineering Prototype — Active Development

---

## 🎯 Problem Statement

Conveyor belts are critical components in mining and industrial material-handling systems.

Unexpected conveyor belt failures can lead to:

- Production downtime
- Belt replacement and repair costs
- Material handling interruptions
- Damage to other conveyor components
- Safety risks
- Increased maintenance requirements

Common conveyor belt problems include:

- Joint/splice damage
- Cracks and cuts
- Surface wear
- Punctures
- Burn or heat damage
- Belt misalignment
- Abnormal vibration
- Excessive temperature
- Belt slipping or abnormal movement

Traditional inspection can depend heavily on periodic manual inspection or individual monitoring systems.

**ConveyorGuard aims to combine multiple monitoring methods into one low-cost intelligent prototype.**

---

# 💡 Our Solution

ConveyorGuard continuously collects information from two major sources:

### 1. Computer Vision

A camera monitors the conveyor belt while a locally trained **YOLO object-detection model** analyzes frames for visible defects.

### 2. Physical Sensors

An ESP32 collects measurements from sensors monitoring:

- Vibration
- Temperature
- Belt alignment/distance
- Electrical/current characteristics
- Belt movement and position

The information is sent to the backend, processed, stored, and displayed on a real-time dashboard.

---

# 🧠 System Architecture

```text
                    ┌───────────────────────┐
                    │    Conveyor Belt      │
                    └───────────┬───────────┘
                                │
               ┌────────────────┴────────────────┐
               │                                 │
               ▼                                 ▼
        USB / Web Camera                   Physical Sensors
               │                                 │
               ▼                                 ▼
      Python + OpenCV + YOLO                    ESP32
               │                                 │
               └──────────────┬──────────────────┘
                              │
                              ▼
                     Node.js / Express API
                              │
                   ┌──────────┴──────────┐
                   │                     │
                   ▼                     ▼
              SQLite Database       Health Logic
                   │                     │
                   └──────────┬──────────┘
                              │
                              ▼
                    React Web Dashboard
```

---

# 🔥 Key Features

## 🤖 AI-Based Damage Detection

ConveyorGuard uses a locally trained YOLO model with OpenCV to process the live camera feed.

The current model can classify dataset-defined belt defects such as:

- Joint Damage
- Burn Damage
- Crack
- Eroded / Surface Damage
- Puncture
- Scratch

> The AI model is currently a prototype trained on a limited custom dataset. Detection accuracy depends heavily on the amount, quality, diversity, and labeling of training data.

---

## 📳 Vibration Monitoring

An **ADXL345 accelerometer** measures conveyor vibration.

The ESP32 collects acceleration along the X, Y, and Z axes and calculates the overall acceleration magnitude.

Abnormal vibration can potentially indicate mechanical problems such as:

- Roller problems
- Bearing problems
- Belt instability
- Mechanical imbalance
- Structural vibration

---

## 🌡️ Temperature Monitoring

An **MLX90614 infrared temperature sensor** provides non-contact temperature measurements.

The system monitors:

- Object temperature
- Ambient temperature

This can help identify abnormal heating conditions around the conveyor system.

---

## ↔️ Belt Alignment Monitoring

Distance/ToF sensors are used to monitor belt position relative to the conveyor structure.

The objective is to detect situations where the belt begins moving away from its expected path.

This can help identify:

- Belt mistracking
- Excessive lateral movement
- Alignment abnormalities

---

## ⚡ Electrical Monitoring

An **INA219 sensor** is used to collect electrical measurements.

Depending on the connected hardware configuration, the system can monitor parameters such as:

- Current
- Voltage
- Power

These measurements can contribute additional information about conveyor operating conditions.

---

## 🔄 Encoder-Based Belt Tracking

A rotary encoder is used to track conveyor movement.

Encoder information allows the system to estimate:

- Roller rotation
- RPM
- Belt movement
- Belt position
- Completed belt cycles

For a known roller diameter:

```text
Distance Travelled =
Roller Rotations × π × Roller Diameter
```

For a known total belt length:

```text
Completed Belt Cycles =
Distance Travelled / Belt Length
```

Current position on the belt can be estimated using:

```text
Belt Position =
Distance Travelled mod Belt Length
```

This provides the foundation for associating detected defects with approximate physical positions on a finite conveyor belt.

---

# 📍 Defect Position Tracking

A major objective of ConveyorGuard is not only to detect a defect, but also to associate it with its approximate location on the belt.

For example:

```text
Camera detects defect
        ↓
Read current encoder position
        ↓
Calculate belt position
        ↓
Associate detection with location
        ↓
Store defect
        ↓
Belt completes another revolution
        ↓
Compare new detection with known defect
```

This is intended to reduce repeatedly treating the same physical defect as a completely new event every time it passes the camera.

---

# ❤️ Conveyor Health Monitoring

ConveyorGuard combines multiple monitoring parameters to create an overall view of conveyor condition.

Inputs can include:

```text
Visual Damage
     +
Vibration
     +
Temperature
     +
Alignment
     +
Electrical Measurements
     +
Encoder / Motion Data
     ↓
Conveyor Health Assessment
```

The current health engine is prototype logic and should not be interpreted as a calibrated industrial remaining-useful-life model.

Accurate predictive maintenance and failure-time estimation would require historical degradation data and validation on real industrial conveyor systems.

---

# 🚨 Severity Classification

Detected conditions can be grouped into severity levels such as:

| Severity | Meaning | Typical Response |
|---|---|---|
| 🟢 LIGHT | Minor abnormality | Monitor |
| 🟡 MODERATE | Noticeable damage | Inspection recommended |
| 🟠 HIGH | Serious condition | Urgent maintenance |
| 🔴 CRITICAL | Severe condition | Immediate attention |

Visual severity can depend on both the **type and extent of damage**.

A small scratch, for example, should not necessarily receive the same severity as a large deep cut.

---

# 📊 Web Dashboard

The ConveyorGuard dashboard provides a centralized interface for monitoring the prototype.

It includes sections for:

- Dashboard
- Joints
- Alerts
- Analytics
- Live Feed
- Reports
- Settings

The dashboard can display:

### ESP32 Diagnostics

- ESP32 connection state
- Sensor initialization status
- Raw sensor readings
- Encoder status

### Sensor Measurements

- ADXL345 acceleration
- MLX90614 temperature
- Distance/alignment readings
- Encoder position and RPM
- INA219 electrical readings

### Vision Monitoring

AI detection information received from the Python vision system.

### Belt Tracking

Encoder-based belt position and cycle information.

### Health Monitoring

Overall conveyor condition calculated from available monitoring parameters.

---

# 🛠️ Hardware Components

The prototype uses hardware including:

| Component | Purpose |
|---|---|
| ESP32 | Main sensor controller |
| USB/Web Camera | Conveyor belt image capture |
| ADXL345 | Vibration monitoring |
| MLX90614 | Non-contact temperature monitoring |
| INA219 | Electrical monitoring |
| Distance / ToF Sensors | Belt alignment monitoring |
| Rotary Encoder | Rotation, RPM and belt position |
| Conveyor Prototype | Physical testing platform |
| Laptop/PC | AI inference, backend and dashboard |

---

# 💻 Software Stack

## Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Recharts
- Lucide React

## Backend

- Node.js
- Express.js
- SQLite
- better-sqlite3
- REST APIs

## Computer Vision

- Python
- OpenCV
- Ultralytics YOLO
- PyTorch

## Embedded System

- ESP32
- Arduino Framework / C++
- I²C sensors
- Rotary encoder

---

# 🔄 Data Flow

```text
SENSORS
   │
   ▼
ESP32
   │
   ▼
Sensor Data
   │
   ▼
Node.js Backend
   │
   ├────────► SQLite Database
   │
   ├────────► Health Engine
   │
   └────────► React Dashboard


CAMERA
   │
   ▼
OpenCV
   │
   ▼
YOLO Model
   │
   ▼
Damage Detection
   │
   ▼
Node.js Backend
   │
   ▼
React Dashboard
```

---

# 📁 Project Structure

```text
conveyor-guard/
│
├── src/
│   ├── pages/
│   │   ├── Analytics.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Joints.jsx
│   │   ├── LiveFeed.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── server/
│   ├── index.js
│   ├── beltTracker.js
│   ├── defectTracker.js
│   ├── healthEngine.js
│   └── ...
│
├── vision/
│   ├── camera_test.py
│   ├── train_model.py
│   ├── dataset/
│   ├── dataset_v2/
│   └── runs/
│
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

> The exact contents of development/training folders may vary between local installations, and large datasets or generated training outputs may be excluded from Git.

---

# 🚀 Running the Project

## 1. Clone the Repository

```bash
git clone <repository-url>
cd conveyor-guard
```

---

## 2. Install Frontend Dependencies

```bash
npm install
```

---

## 3. Start the Frontend

```bash
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

---

## 4. Start the Backend

Open another terminal:

```bash
cd server
npm install
node index.js
```

The backend is configured to run locally on:

```text
http://localhost:5000
```

---

## 5. Install Python Requirements

The vision system requires Python packages including:

```bash
pip install ultralytics opencv-python requests
```

A compatible PyTorch installation is also required by Ultralytics.

---

## 6. Start AI Vision

Open another terminal:

```bash
cd vision
python camera_test.py
```

The camera should open and YOLO will begin processing frames.

Press:

```text
Q
```

to close the vision window.

---

## 7. Connect ESP32

Connect the ESP32 containing the ConveyorGuard sensor firmware to the computer.

Once communication is established, the dashboard can receive physical sensor readings through the backend integration.

---

# 🧪 YOLO Model Training

The custom vision model can be trained using Ultralytics YOLO.

Example:

```python
from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data="dataset_v2/data.yaml",
    epochs=100,
    imgsz=640,
    device="cpu"
)
```

After training, the generated `best.pt` weights can be loaded by the vision application.

---

# 📸 Dataset

The object-detection dataset contains custom conveyor belt images with manually annotated defects.

Good dataset development should include:

- Different lighting conditions
- Different camera angles
- Different distances
- Different belt positions
- Different defect sizes
- Normal/background belt images
- Multiple genuinely different examples of each defect

Near-identical frames should not be distributed across training, validation, and test sets because this can produce misleading evaluation results.

Increasing the amount and diversity of real conveyor data is one of the main areas for future improvement.

---

# ⚠️ Current Prototype Limitations

ConveyorGuard is currently an **engineering prototype**, not a certified industrial safety system.

Current limitations include:

- Small custom computer-vision dataset
- AI classification can produce false positives and incorrect classes
- Sensor thresholds require physical calibration
- Encoder calculations require accurate mechanical calibration
- Belt slip can affect encoder-based position estimates
- Defect re-identification requires further testing
- Health scoring is prototype logic
- Remaining-life prediction requires real degradation/failure data
- Sensors and electronics require industrial protection before deployment in mining environments

The system should therefore not be used as the sole basis for safety-critical conveyor shutdown decisions in its current form.

---

# 🔮 Future Improvements

Future development can include:

- Larger industrial conveyor dataset
- Improved YOLO model accuracy
- Better defect-size estimation
- Longitudinal tear detection
- Improved joint/splice analysis
- Automated defect re-identification
- More accurate belt-position mapping
- Sensor fusion
- Historical trend analysis
- Predictive maintenance models
- Remaining Useful Life estimation
- Automatic maintenance alerts
- Industrial-grade vibration sensors
- Thermal camera integration
- Edge AI processing
- Cloud monitoring
- Multiple conveyor support
- Mobile notifications
- Industrial enclosure and electrical isolation

---

# 🌟 Innovation

Commercial conveyor monitoring technologies already exist.

ConveyorGuard does **not** claim to be the first conveyor-monitoring system.

The objective of this project is to demonstrate how a relatively low-cost prototype can integrate:

```text
Computer Vision
      +
Vibration Monitoring
      +
Temperature Monitoring
      +
Alignment Monitoring
      +
Electrical Monitoring
      +
Encoder Tracking
      +
Defect Position Memory
      +
Health Analysis
      +
Real-Time Dashboard
```

into one unified monitoring architecture.

This multimodal approach allows the prototype to examine both **visible belt condition** and **physical operating parameters** rather than relying on a single monitoring method.

---

# 🏭 Target Applications

The concept can potentially be adapted for:

- Iron ore mines
- Coal mines
- Mineral processing plants
- Cement plants
- Steel plants
- Warehouses
- Manufacturing facilities
- Bulk material handling systems

---

# 🎓 Project Context

This project was developed as a prototype for the **Smart India Hackathon (SIH)**.

The goal is to explore an affordable and intelligent approach to conveyor belt health monitoring using AI, IoT sensors, embedded systems, and full-stack software.

---

# 👥 Team

**Project:** ConveyorGuard  
**Category:** Smart India Hackathon  
**Domain:** Mining / Industrial Predictive Maintenance  
**Technology:** AI + IoT + Computer Vision + Embedded Systems + Full-Stack Development

---

# 📌 Project Status

🚧 **Active Development / Prototype**

The hardware, sensor integration, computer-vision model, health algorithms, and dashboard are under continued development and testing.

---

## ConveyorGuard

**Detect early. Monitor continuously. Maintain intelligently.**
