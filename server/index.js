const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = new Database("conveyor.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conveyorId TEXT,
    source TEXT,

    vibration REAL,
    temperature REAL,
    motorCurrent REAL,
    beltSpeed REAL,
    alignment REAL,

    healthScore INTEGER,
    status TEXT,
    failureRisk TEXT,

    simulationMode TEXT,

    timestamp TEXT
  )
`);

const insertReading = db.prepare(`
  INSERT INTO sensor_readings (
    conveyorId,
    source,
    vibration,
    temperature,
    motorCurrent,
    beltSpeed,
    alignment,
    healthScore,
    status,
    failureRisk,
    simulationMode,
    timestamp
  )
  VALUES (
    @conveyorId,
    @source,
    @vibration,
    @temperature,
    @motorCurrent,
    @beltSpeed,
    @alignment,
    @healthScore,
    @status,
    @failureRisk,
    @simulationMode,
    @timestamp
  )
`);

app.get("/", (req, res) => {
  res.json({
    system: "ConveyorGuard",
    status: "Backend Online",
    database: "SQLite Connected",
  });
});

app.get("/api/status", (req, res) => {
  const count = db
    .prepare("SELECT COUNT(*) AS total FROM sensor_readings")
    .get();

  res.json({
    conveyorId: "CB-01",
    backend: "online",
    database: "connected",
    esp32: "not-connected",
    camera: "not-connected",
    simulation: true,
    storedReadings: count.total,
  });
});

app.post("/api/sensor-data", (req, res) => {
  const reading = {
    conveyorId: req.body.conveyorId || "CB-01",
    source: req.body.source || "SIMULATOR",

    vibration: req.body.vibration ?? null,
    temperature: req.body.temperature ?? null,
    motorCurrent: req.body.motorCurrent ?? null,
    beltSpeed: req.body.beltSpeed ?? null,
    alignment: req.body.alignment ?? null,

    healthScore: req.body.healthScore ?? null,
    status: req.body.status || "Unknown",
    failureRisk: req.body.failureRisk || "Unknown",

    simulationMode:
      req.body.simulationMode || "UNKNOWN",

    timestamp:
      req.body.timestamp || new Date().toISOString(),
  };

  try {
    const result = insertReading.run(reading);

    console.log(
      `[${reading.source}] Mode: ${reading.simulationMode} | ` +
      `Vibration: ${reading.vibration} | ` +
      `Temp: ${reading.temperature} | ` +
      `Health: ${reading.healthScore}`
    );

    res.status(201).json({
      success: true,
      message: "Sensor reading saved to SQLite",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Database insert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save sensor reading",
    });
  }
});

app.get("/api/sensor-data/latest", (req, res) => {
  const reading = db
    .prepare(`
      SELECT *
      FROM sensor_readings
      ORDER BY id DESC
      LIMIT 1
    `)
    .get();

  if (!reading) {
    return res.json({
      message: "No sensor readings received yet",
    });
  }

  res.json(reading);
});

app.get("/api/sensor-data", (req, res) => {
  const readings = db
    .prepare(`
      SELECT *
      FROM sensor_readings
      ORDER BY id DESC
      LIMIT 100
    `)
    .all();

  res.json(readings);
});
app.get("/api/reports/summary", (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT
        COUNT(*) AS totalReadings,
        ROUND(AVG(vibration), 2) AS avgVibration,
        ROUND(MAX(vibration), 2) AS maxVibration,
        ROUND(AVG(temperature), 2) AS avgTemperature,
        ROUND(MAX(temperature), 2) AS maxTemperature,
        ROUND(AVG(motorCurrent), 2) AS avgMotorCurrent,
        ROUND(MAX(motorCurrent), 2) AS maxMotorCurrent,
        ROUND(AVG(alignment), 2) AS avgAlignment,
        ROUND(MAX(alignment), 2) AS maxAlignment,
        ROUND(AVG(healthScore), 0) AS avgHealth,
        MIN(healthScore) AS lowestHealth
      FROM sensor_readings
    `).get();

    const modes = db.prepare(`
      SELECT
        simulationMode,
        COUNT(*) AS count
      FROM sensor_readings
      GROUP BY simulationMode
    `).all();

    res.json({
      conveyorId: "CB-01",
      summary,
      operatingModes: modes,
    });
  } catch (error) {
    console.error("Report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
});
app.delete("/api/sensor-data", (req, res) => {
  db.prepare("DELETE FROM sensor_readings").run();

  res.json({
    success: true,
    message: "All sensor readings deleted",
  });
});

app.listen(PORT, () => {
  console.log(
    `ConveyorGuard backend running on http://localhost:${PORT}`
  );
  console.log("SQLite database connected: conveyor.db");
});