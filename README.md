# 🏭 ConveyorGuard

### Intelligent Conveyor Belt Health Monitoring System

ConveyorGuard is an intelligent conveyor belt condition-monitoring and fault-detection system being developed as a prototype for **Smart India Hackathon (SIH)**.

The system combines multiple sensors, computer vision, real-time monitoring, historical data analysis, and automated alerts to identify developing conveyor faults before they lead to equipment failure or unplanned downtime.

> 🚧 **Development Status:** Active Prototype Development  
> Current dashboard data is generated using a sensor simulator. Physical ESP32 sensors and the computer-vision system are planned for integration with the prototype.

---

## 🎯 Problem Statement

Conveyor belts are widely used in manufacturing, mining, warehouses, logistics, and material-handling systems.

Failures such as:

- Belt misalignment
- Excessive vibration
- Motor overload
- Roller or bearing abnormalities
- Belt joint/splice damage
- Belt jams
- Abnormal temperature

can lead to equipment damage, production downtime, maintenance costs, and safety risks.

Traditional inspection can depend heavily on periodic manual checks, which may not identify a developing fault early enough.

---

## 💡 Proposed Solution

ConveyorGuard provides a **multi-sensor monitoring layer** that can be integrated with a conveyor system.

The prototype combines:

- Vibration monitoring
- Motor-current monitoring
- Temperature monitoring
- Belt-alignment monitoring
- Belt-speed monitoring
- Camera-based belt joint inspection
- Health-score calculation
- Fault alerts
- Historical sensor logging
- Analytics and reporting

The long-term objective is to correlate information from multiple sensors instead of relying on a single measurement.

---

## ⚙️ System Architecture

```text
                    CONVEYOR BELT
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Vibration         Temperature      Motor Current
   ADXL345            MLX90614          INA219
        │                │                │
        └────────────────┼────────────────┘
                         │
                       ESP32
                         │
                 Wi-Fi / USB Data
                         │
                         ▼
                 Node.js Backend
                         │
                    SQLite Database
                         │
                         ▼
                React Web Dashboard
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       Alerts         Analytics       Reports


USB Camera
    │
    ▼
Computer Vision
    │
    └──────────────► Belt Joint Inspection
```

During the current software-development phase, a sensor simulator generates test readings so that the dashboard, backend, database, alerts, and analytics can be developed before physical sensor integration.

---

## 🔬 Planned Hardware

| Component | Purpose |
|---|---|
| ESP32 DevKit | Sensor acquisition and communication |
| ADXL345 | Vibration monitoring |
| INA219 | Motor-current monitoring |
| VL53L0X ×2 | Belt-alignment measurement |
| MLX90614 | Non-contact temperature monitoring |
| Rotary Encoder | Belt speed/distance measurement |
| USB Camera | Belt joint and surface inspection |
| Emergency Stop | Manual emergency isolation input |
| Relay Module | Prototype motor shutdown control |
| Buzzer | Local warning indication |

> Final motor driver and power-supply selection will depend on the actual prototype motor's rated voltage, operating current, and stall current.

---

## 🖥️ Software Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React

### Backend

- Node.js
- Express.js
- REST API
- CORS

### Database

- SQLite
- better-sqlite3

### Planned Embedded System

- ESP32
- Sensor interfaces including I²C and GPIO
- Wi-Fi/USB communication

### Planned Computer Vision

- Python
- OpenCV
- USB camera
- Belt joint / surface defect detection

---

## 📊 Dashboard Features

The current dashboard includes:

- Conveyor health score
- Live vibration readings
- Joint temperature
- Motor current
- Belt speed
- Belt alignment
- Failure-risk indication
- Experimental joint monitoring
- Live sensor charts
- Alert generation
- Analytics
- Historical reports
- Backend connection status
- Configurable monitoring interface

---

## 🧪 Fault Simulation

Before connecting physical hardware, ConveyorGuard provides three prototype simulation modes:

### 🟢 NORMAL

Simulates healthy conveyor operation.

### 🟡 WARNING

Simulates developing abnormalities such as increasing vibration, temperature, motor load, and alignment deviation.

### 🔴 CRITICAL

Simulates severe operating conditions for testing critical alerts and system behaviour.

Simulation allows the software stack to be tested without falsely presenting simulated measurements as real sensor data.

---

## 🧠 Planned Fault Classification

The next stage of the system will correlate multiple sensor readings to identify possible failure conditions such as:

```text
BELT MISALIGNMENT
ROLLER / BEARING ANOMALY
MOTOR OVERLOAD
POSSIBLE BELT JAM
BELT JOINT DAMAGE
```

Example:

```text
Motor Current ↑
Belt Speed ↓
        │
        ▼
Possible Mechanical Resistance / Jam
```

Another example:

```text
Alignment Deviation ↑
Vibration ↑
        │
        ▼
Possible Belt Tracking Problem
```

This multi-sensor approach is intended to provide more useful fault information than independent threshold alarms alone.

---

## 📷 Computer Vision

A USB camera is planned to monitor the experimental belt-joint inspection zone.

The computer-vision module is intended to detect visible conditions such as:

- Joint/splice abnormalities
- Surface damage
- Cuts
- Cracks
- Possible belt deterioration

**Computer vision is not yet connected to the current prototype.**

The dashboard therefore identifies camera/CV functionality as simulated or unavailable until real camera processing is implemented and validated.

---

## 🗄️ Data Logging

Sensor readings are transmitted to the Node.js backend and stored in an SQLite database.

The system currently stores information including:

```text
Conveyor ID
Data Source
Vibration
Temperature
Motor Current
Belt Speed
Alignment
Health Score
Status
Failure Risk
Simulation Mode
Timestamp
```

Historical data is then used for dashboard reports and analytics.

---

## 📈 Reporting

The reporting system calculates information from stored SQLite readings including:

- Total stored readings
- Average vibration
- Peak vibration
- Average temperature
- Peak temperature
- Average motor current
- Peak motor current
- Average alignment deviation
- Peak alignment deviation
- Average health score
- Lowest health score
- Operating-mode distribution

---

## 🔄 Current Data Flow

```text
Sensor Simulator
       │
       ▼
React SensorContext
       │
       ├────────► Dashboard
       ├────────► Charts
       ├────────► Analytics
       └────────► Alerts
       │
       ▼
HTTP POST
       │
       ▼
Node.js / Express Backend
       │
       ▼
SQLite Database
```

---

## 🔮 Target Data Flow

After hardware integration:

```text
Physical Sensors
       │
       ▼
     ESP32
       │
       ▼
Node.js Backend
       │
       ├────────► Fault Detection
       ├────────► Alert System
       ├────────► SQLite
       └────────► Safety Logic
                         │
                         ▼
                  React Dashboard


USB Camera
     │
     ▼
Python / OpenCV
     │
     ▼
Joint Defect Detection
```

---

## 📁 Project Structure

```text
ConveyorGuard/
│
├── public/
│
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── pages/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── server/
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

Additional directories for ESP32 firmware and computer vision will be introduced as those modules are implemented.

---

## 🚀 Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/Om1311gamerz/ConveyorGuard.git
```

Enter the project:

```bash
cd ConveyorGuard
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

Return to the project root:

```bash
cd ..
```

### 4. Start the backend

From the `server` directory:

```bash
node index.js
```

Backend:

```text
http://localhost:5000
```

### 5. Start the frontend

From the project root:

```bash
npm run dev
```

Frontend development server:

```text
http://localhost:5173
```

---

## 🛠️ Development Roadmap

- [x] React monitoring dashboard
- [x] Live sensor-data simulation
- [x] Normal / Warning / Critical test modes
- [x] Shared sensor-data context
- [x] Live charts
- [x] Basic threshold alerts
- [x] Node.js backend
- [x] REST sensor-data API
- [x] SQLite persistent sensor logging
- [x] Database-generated reporting
- [ ] Centralized configurable thresholds
- [ ] Persistent alert-event database
- [ ] Multi-sensor fault classification
- [ ] Emergency shutdown logic
- [ ] ESP32 communication
- [ ] Physical sensor integration
- [ ] USB camera stream
- [ ] Computer-vision defect detection
- [ ] Hardware calibration
- [ ] Prototype validation and testing
- [ ] Final SIH demonstration

---

## 🎯 Project Objective

The objective of ConveyorGuard is to demonstrate how a relatively low-cost monitoring system can combine **IoT sensors, data analytics, computer vision, and automated fault detection** to improve conveyor condition awareness.

A key design direction is **retrofitability**: the monitoring system should act as an additional intelligence layer for an existing conveyor rather than requiring replacement of the entire conveyor system.

---

## ⚠️ Prototype Disclaimer

ConveyorGuard is currently a **student experimental prototype** and should not be treated as an industrial safety or certified predictive-maintenance system.

Thresholds, health scores, simulated faults, and future automatic shutdown behaviour must be calibrated and validated using the physical prototype before being treated as reliable operational decisions.

---

## 👨‍💻 Project

**ConveyorGuard — Intelligent Conveyor Belt Health Monitoring System**

Developed as a Smart India Hackathon project prototype.

---

## 📌 Repository Status

🚧 **Active Development**

The repository will continue to be updated as physical sensors, ESP32 communication, computer vision, fault classification, and prototype testing are completed.
