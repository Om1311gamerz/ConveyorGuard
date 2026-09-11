const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const BeltTracker =
  require("./beltTracker");

const DefectTracker =
  require("./defectTracker");

const HardwareState =
  require("./hardwareState");

const MotorControlState =
  require("./motorControlState");

const {
  calculateHealth,
} = require("./healthEngine");


const app = express();

const PORT = Number(process.env.PORT || 5000);


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(express.json());


// ==================================================
// DATABASE
// ==================================================

const db =
  new Database("conveyor.db");


db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    vibration REAL,
    temperature REAL,
    motor_current REAL,
    alignment REAL,
    rpm REAL,
    belt_speed REAL
  )
`);


// ==================================================
// BELT TRACKER
// ==================================================

const beltTracker =
  new BeltTracker({
    beltLengthMeters: 2.0,
    rollerDiameterMeters: 0.05,
    encoderPPR: 600,
  });


// ==================================================
// DEFECT TRACKER
// ==================================================

const defectTracker =
  new DefectTracker({
    beltLengthMeters: 2.0,
    positionToleranceMeters: 0.20,
  });

const hardwareState =
  new HardwareState();

const motorControl =
  new MotorControlState();

function ingestHardwarePayload(payload) {
  const hardware =
    hardwareState.update(payload);

  if (
    payload.type === "measurement" &&
    payload.motor_estop_latched === true &&
    motorControl.running
  ) {
    motorControl.engageEmergencyStop(
      "ESP32 safety latch stopped the motor"
    );
  }

  return hardware;
}

function currentHardware() {
  const hardware =
    hardwareState.snapshot();

  if (
    !hardware.connected &&
    motorControl.running
  ) {
    motorControl.engageEmergencyStop(
      "ESP32 heartbeat lost"
    );
  }

  return hardware;
}

function motorStatus() {
  const hardware =
    currentHardware();
  const firmwareCompatible =
    hardware.connected &&
    hardware.measurement?.motor_estop_latched !== null &&
    hardware.measurement?.motor_estop_latched !== undefined;

  return {
    ...motorControl.snapshot(),
    hardwareConnected:
      hardware.connected,
    firmwareCompatible,
    firmware:
      hardware.measurement
        ? {
            emergencyStop:
              hardware.measurement.motor_estop_latched,
            commandFresh:
              hardware.measurement.motor_command_fresh,
            runRequested:
              hardware.measurement.motor_run_requested,
            relayOn:
              hardware.measurement.motor_relay_on,
            targetPercent:
              hardware.measurement.motor_target_percent,
            pwmPercent:
              hardware.measurement.motor_pwm_percent,
            commandSequence:
              hardware.measurement.motor_command_sequence,
            encoderRpm:
              hardware.measurement.encoder_rpm,
            currentMa:
              hardware.measurement.current_ma,
          }
        : null,
  };
}


// ==================================================
// LATEST HEALTH
// ==================================================

let latestHealth = {
  healthScore: 100,
  condition: "HEALTHY",
  damageScore: 0,

  factors: {
    visualDamage: 0,
    vibration: 0,
    temperature: 25,
    temperatureRisk: 0,
    misalignment: 0,
    alignmentRisk: 0,
    motorLoad: 0,
  },
};


// ==================================================
// LATEST VISION
// ==================================================

let latestVision = {
  connected: false,
  defectDetected: false,

  defectId: null,
  type: null,

  confidence: 0,
  severity: 0,

  beltPosition: null,
  cycle: 0,

  timesSeen: 0,

  timestamp: null,
};


// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {
  res.json({
    name: "BeltGuard AI",
    backend: "running",
  });
});


// ==================================================
// SYSTEM STATUS
// ==================================================

app.get("/api/status", (req, res) => {
  const hardware =
    hardwareState.snapshot();

  res.json({
    backend: true,

    database: true,

    visionConnected:
      latestVision.connected,

    hardwareConnected:
      hardware.connected,

    timestamp:
      new Date().toISOString(),
  });
});


// ==================================================
// ESP32 HARDWARE DIAGNOSTIC STREAM
// ==================================================

app.post(
  "/api/hardware/serial",
  (req, res) => {
    try {
      const hardware =
        ingestHardwarePayload(req.body);

      res.json({
        success: true,
        connected:
          hardware.connected,
        sampleAgeMs:
          hardware.sampleAgeMs,
        motorCommand:
          motorControl.command(),
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);


// ==================================================
// GUARDED MOTOR CONTROL
// ==================================================

function motorAction(res, action) {
  try {
    action();
    res.json({
      success: true,
      motor: motorStatus(),
    });
  } catch (error) {
    res.status(409).json({
      success: false,
      error: error.message,
      motor: motorStatus(),
    });
  }
}

app.get(
  "/api/motor/status",
  (req, res) => {
    res.json(motorStatus());
  }
);

app.post(
  "/api/motor/emergency-stop",
  (req, res) => {
    motorControl.engageEmergencyStop(
      "Website emergency stop pressed"
    );
    res.json({
      success: true,
      motor: motorStatus(),
    });
  }
);

app.post(
  "/api/motor/reset",
  (req, res) => {
    motorAction(res, () =>
      motorControl.resetEmergencyStop(
        motorStatus().firmwareCompatible
      )
    );
  }
);

app.post(
  "/api/motor/arm",
  (req, res) => {
    motorAction(res, () =>
      motorControl.arm(
        motorStatus().firmwareCompatible
      )
    );
  }
);

app.post(
  "/api/motor/speed",
  (req, res) => {
    motorAction(res, () =>
      motorControl.setSpeed(
        req.body.speedPercent,
        motorStatus().firmwareCompatible
      )
    );
  }
);

app.post(
  "/api/motor/start",
  (req, res) => {
    motorAction(res, () =>
      motorControl.start(
        motorStatus().firmwareCompatible
      )
    );
  }
);

app.post(
  "/api/motor/stop",
  (req, res) => {
    motorControl.stop(
      "Website stop pressed"
    );
    res.json({
      success: true,
      motor: motorStatus(),
    });
  }
);


app.get(
  "/api/hardware/latest",
  (req, res) => {
    res.json(
      hardwareState.snapshot()
    );
  }
);


// ==================================================
// SENSOR DATA
// ==================================================

app.post(
  "/api/sensor-data",
  (req, res) => {
    try {
      const {
        vibration = 0,
        temperature = 0,
        motor_current = 0,
        motorCurrent = 0,
        current = 0,
        alignment = 0,
        rpm = 0,
        belt_speed = 0,
        beltSpeed = 0,
      } = req.body;

      const actualCurrent =
        Number(
          motor_current ||
          motorCurrent ||
          current ||
          0
        );

      const actualSpeed =
        Number(
          belt_speed ||
          beltSpeed ||
          0
        );

      const statement =
        db.prepare(`
          INSERT INTO sensor_readings
          (
            vibration,
            temperature,
            motor_current,
            alignment,
            rpm,
            belt_speed
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `);

      const result =
        statement.run(
          Number(vibration),
          Number(temperature),
          actualCurrent,
          Number(alignment),
          Number(rpm),
          actualSpeed
        );

      res.json({
        success: true,
        id:
          result.lastInsertRowid,
      });

    } catch (error) {
      console.error(
        "Sensor database error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);


// ==================================================
// LATEST SENSOR DATA
// ==================================================

app.get(
  "/api/sensor-data/latest",
  (req, res) => {
    try {
      const reading =
        db.prepare(`
          SELECT *
          FROM sensor_readings
          ORDER BY id DESC
          LIMIT 1
        `).get();

      res.json(
        reading || null
      );

    } catch (error) {
      res.status(500).json({
        error:
          error.message,
      });
    }
  }
);


// ==================================================
// SENSOR HISTORY
// ==================================================

app.get(
  "/api/sensor-data",
  (req, res) => {
    try {
      const readings =
        db.prepare(`
          SELECT *
          FROM sensor_readings
          ORDER BY id DESC
          LIMIT 100
        `).all();

      res.json(readings);

    } catch (error) {
      res.status(500).json({
        error:
          error.message,
      });
    }
  }
);


// ==================================================
// CLEAR SENSOR HISTORY
// ==================================================

app.delete(
  "/api/sensor-data",
  (req, res) => {
    try {
      db.prepare(
        "DELETE FROM sensor_readings"
      ).run();

      res.json({
        success: true,
      });

    } catch (error) {
      res.status(500).json({
        error:
          error.message,
      });
    }
  }
);


// ==================================================
// ENCODER / BELT TRACKING
// ==================================================

app.post(
  "/api/belt/pulses",
  (req, res) => {
    const pulses =
      Number(req.body.pulses);

    if (
      !Number.isFinite(pulses) ||
      pulses <= 0
    ) {
      return res.status(400).json({
        error:
          "Positive pulse value required",
      });
    }

    const status =
      beltTracker.addPulses(
        pulses
      );

    res.json(status);
  }
);


app.get(
  "/api/belt/status",
  (req, res) => {
    res.json(
      beltTracker.getStatus()
    );
  }
);


// ==================================================
// HEALTH ENGINE
// ==================================================

app.post(
  "/api/health",
  (req, res) => {
    try {
      latestHealth =
        calculateHealth(
          req.body
        );

      res.json(
        latestHealth
      );

    } catch {
      res.status(500).json({
        error:
          "Health calculation failed",
      });
    }
  }
);


app.get(
  "/api/health/latest",
  (req, res) => {
    res.json(
      latestHealth
    );
  }
);


// ==================================================
// VISION DETECTION
// ==================================================

app.post(
  "/api/vision/detection",
  (req, res) => {
    try {
      const {
        type,
        confidence,
        severity,
        beltPosition,
        cycle,
      } = req.body;

      if (
        !type ||
        beltPosition ===
          undefined ||
        beltPosition === null
      ) {
        return res
          .status(400)
          .json({
            error:
              "type and beltPosition are required",
          });
      }

      const result =
        defectTracker.recordDetection({
          type:
            String(type),

          confidence:
            Number(
              confidence || 0
            ),

          severity:
            Number(
              severity || 0
            ),

          beltPosition:
            Number(
              beltPosition
            ),

          cycle:
            Number(
              cycle || 0
            ),
        });


      const defect =
        result.defect;


      latestVision = {
        connected: true,

        defectDetected: true,

        defectId:
          defect.id,

        type:
          defect.type,

        confidence:
          defect.latestConfidence,

        severity:
          defect.latestSeverity,

        beltPosition:
          Number(
            beltPosition
          ),

        cycle:
          Number(cycle),

        timesSeen:
          defect.timesSeen,

        timestamp:
          new Date().toISOString(),
      };


      res.json(result);

    } catch (error) {
      console.error(
        "Vision error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to record detection",
      });
    }
  }
);


// ==================================================
// VISION — NO DEFECT / HEARTBEAT
// ==================================================

app.post(
  "/api/vision/clear",
  (req, res) => {
    const {
      beltPosition = null,
      cycle = 0,
    } = req.body || {};

    latestVision = {
      connected: true,

      defectDetected: false,

      defectId: null,
      type: null,

      confidence: 0,
      severity: 0,

      beltPosition,

      cycle,

      timesSeen: 0,

      timestamp:
        new Date().toISOString(),
    };

    res.json({
      success: true,
    });
  }
);


// ==================================================
// LATEST VISION STATUS
// ==================================================

app.get(
  "/api/vision/latest",
  (req, res) => {
    res.json(
      latestVision
    );
  }
);


// ==================================================
// ALL DEFECTS
// ==================================================

app.get(
  "/api/vision/defects",
  (req, res) => {
    res.json(
      defectTracker.getDefects()
    );
  }
);


// ==================================================
// ONE DEFECT
// ==================================================

app.get(
  "/api/vision/defects/:id",
  (req, res) => {
    const defect =
      defectTracker.getDefect(
        req.params.id
      );

    if (!defect) {
      return res
        .status(404)
        .json({
          error:
            "Defect not found",
        });
    }

    res.json(defect);
  }
);


// ==================================================
// CLEAR DEFECT HISTORY
// ==================================================

app.delete(
  "/api/vision/defects",
  (req, res) => {
    defectTracker.clear();

    latestVision = {
      connected: false,
      defectDetected: false,
      defectId: null,
      type: null,
      confidence: 0,
      severity: 0,
      beltPosition: null,
      cycle: 0,
      timesSeen: 0,
      timestamp: null,
    };

    res.json({
      success: true,
    });
  }
);


// ==================================================
// COMPLETE BELTGUARD STATUS
// ==================================================

app.get(
  "/api/beltguard/status",
  (req, res) => {
    const latestSensor =
      db.prepare(`
        SELECT *
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT 1
      `).get();

    res.json({
      timestamp:
        new Date().toISOString(),

      belt:
        beltTracker.getStatus(),

      health:
        latestHealth,

      vision:
        latestVision,

      sensors:
        latestSensor || null,

      defects:
        defectTracker.getDefects(),
    });
  }
);


// ==================================================
// REPORT SUMMARY
// ==================================================

app.get(
  "/api/reports/summary",
  (req, res) => {
    const summary =
      db.prepare(`
        SELECT
          COUNT(*) AS total_readings,
          AVG(vibration) AS average_vibration,
          AVG(temperature) AS average_temperature,
          AVG(motor_current) AS average_motor_current,
          AVG(alignment) AS average_alignment,
          AVG(rpm) AS average_rpm
        FROM sensor_readings
      `).get();

    res.json(summary);
  }
);


// ==================================================
// START SERVER — KEEP THIS LAST
// ==================================================

const server = app.listen(
  PORT,
  "127.0.0.1",
  () => {
    console.log("");
    console.log(
      "=============================="
    );

    console.log(
      "BELTGUARD BACKEND RUNNING"
    );

    console.log(
      `http://localhost:${PORT}`
    );

    console.log(
      "=============================="
    );

    console.log("");
  }
);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    db.close();
  } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1200).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
