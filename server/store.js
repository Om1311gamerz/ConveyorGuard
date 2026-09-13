const path = require("node:path");
const Database = require("better-sqlite3");
const { defaults, validateConfig } = require("./config");
const { calculateHealth } = require("./healthEngine");
const { filters, limit } = require("./validation");

class Store {
  constructor(filename = process.env.DB_PATH || path.join(__dirname, "conveyor.db")) {
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        vibration REAL, temperature REAL, motor_current REAL, alignment REAL, rpm REAL, belt_speed REAL
      );
      CREATE TABLE IF NOT EXISTS configuration (id INTEGER PRIMARY KEY CHECK(id = 1), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, updated_at TEXT NOT NULL,
        conveyor_id TEXT NOT NULL, source TEXT NOT NULL, fault_type TEXT NOT NULL, severity TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE', explanation TEXT NOT NULL, recommendation TEXT NOT NULL,
        signals TEXT NOT NULL, occurrences INTEGER NOT NULL DEFAULT 1, resolved_at TEXT, acknowledged_at TEXT
      );
      CREATE TABLE IF NOT EXISTS vision_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS defect_state (id INTEGER PRIMARY KEY CHECK(id = 1), json TEXT NOT NULL);
    `);
    const columns = new Set(this.db.prepare("PRAGMA table_info(sensor_readings)").all().map(c => c.name));
    // Additive migration: old rows keep UNKNOWN provenance and their original values.
    const additions = {
      source: "TEXT NOT NULL DEFAULT 'UNKNOWN'", conveyor_id: "TEXT NOT NULL DEFAULT 'CB-01'",
      simulation_mode: "TEXT", belt_position: "REAL", alignment_left: "REAL", alignment_right: "REAL",
      emergency_stop: "INTEGER", health_score: "REAL", condition: "TEXT", health_json: "TEXT", thresholds_json: "TEXT",
    };
    this.db.transaction(() => {
      for (const [name, type] of Object.entries(additions)) if (!columns.has(name)) this.db.exec(`ALTER TABLE sensor_readings ADD COLUMN ${name} ${type}`);
      this.db.exec("CREATE INDEX IF NOT EXISTS sensor_source_id ON sensor_readings(source, conveyor_id, id); CREATE INDEX IF NOT EXISTS alerts_source_status ON alert_events(source, conveyor_id, status);");
    })();
    const saved = this.db.prepare("SELECT json FROM configuration WHERE id = 1").get();
    this.config = saved ? validateConfig(JSON.parse(saved.json)) : structuredClone(defaults);
  }

  saveConfig(input) {
    const config = validateConfig(input);
    this.db.prepare("INSERT INTO configuration(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(config));
    this.config = config;
    return structuredClone(config);
  }

  ingest(reading, vision = null) {
    const timestamp = new Date().toISOString();
    const health = calculateHealth(reading, this.config.thresholds, vision);
    return this.db.transaction(() => {
      const result = this.db.prepare(`INSERT INTO sensor_readings
        (timestamp,vibration,temperature,motor_current,alignment,rpm,belt_speed,source,conveyor_id,simulation_mode,belt_position,alignment_left,alignment_right,emergency_stop,health_score,condition,health_json,thresholds_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        timestamp, reading.vibration, reading.temperature, reading.motor_current, reading.alignment, reading.rpm,
        reading.belt_speed, reading.source, reading.conveyorId, reading.simulationMode,
        reading.beltPosition, reading.alignmentLeft, reading.alignmentRight, Number(reading.emergencyStop),
        health.healthScore, health.condition, JSON.stringify(health), JSON.stringify(this.config.thresholds),
      );
      this.reconcileAlerts(reading.source, reading.conveyorId, health.faults.filter(f => f.faultType !== "BELT_JOINT_DAMAGE"), timestamp);
      return { success: true, id: Number(result.lastInsertRowid), reading: this.latest({ source: reading.source, conveyorId: reading.conveyorId }), health };
    })();
  }

  reconcileAlerts(source, conveyorId, faults, timestamp = new Date().toISOString()) {
    const existing = this.db.prepare("SELECT * FROM alert_events WHERE source=? AND conveyor_id=? AND status='ACTIVE'").all(source, conveyorId);
    for (const event of existing) {
      if (!faults.some(f => f.faultType === event.fault_type && f.severity === event.severity)) this.db.prepare("UPDATE alert_events SET status='RESOLVED',resolved_at=?,updated_at=? WHERE id=?").run(timestamp, timestamp, event.id);
    }
    for (const fault of faults) {
      const event = existing.find(e => e.fault_type === fault.faultType && e.severity === fault.severity);
      if (event) this.db.prepare("UPDATE alert_events SET updated_at=?,occurrences=occurrences+1,explanation=?,signals=? WHERE id=?").run(timestamp, fault.explanation, JSON.stringify(fault.contributingSignals), event.id);
      else this.db.prepare(`INSERT INTO alert_events(timestamp,updated_at,conveyor_id,source,fault_type,severity,explanation,recommendation,signals) VALUES(?,?,?,?,?,?,?,?,?)`).run(timestamp, timestamp, conveyorId, source, fault.faultType, fault.severity, fault.explanation, fault.recommendation, JSON.stringify(fault.contributingSignals));
    }
  }

  decode(row) {
    if (!row) return null;
    return { ...row, health: row.health_json ? JSON.parse(row.health_json) : null, health_json: undefined, thresholds_json: undefined, emergencyStop: row.emergency_stop === 1 };
  }

  latest(query = {}) {
    const f = filters(query);
    return this.decode(this.db.prepare(`SELECT * FROM sensor_readings${f.where} ORDER BY id DESC LIMIT 1`).get(...f.params));
  }

  history(query = {}) {
    const f = filters(query);
    return this.db.prepare(`SELECT * FROM sensor_readings${f.where} ORDER BY id DESC LIMIT ?`).all(...f.params, limit(query)).map(r => this.decode(r));
  }

  alerts(query = {}) {
    const f = filters(query);
    if (query.status && !["ACTIVE", "RESOLVED"].includes(query.status)) throw new TypeError("status must be ACTIVE or RESOLVED");
    const where = f.where + (query.status ? `${f.where ? " AND" : " WHERE"} status = ?` : "");
    const params = query.status ? [...f.params, query.status] : f.params;
    return this.db.prepare(`SELECT * FROM alert_events${where} ORDER BY id DESC LIMIT ?`).all(...params, limit(query)).map(row => ({ ...row, contributingSignals: JSON.parse(row.signals), signals: undefined, method: "PROTOTYPE_HEURISTIC" }));
  }

  summary(query = {}) {
    const f = filters(query);
    const raw = this.db.prepare(`SELECT COUNT(*) totalReadings,
      AVG(vibration) avgVibration, MAX(vibration) maxVibration, AVG(temperature) avgTemperature, MAX(temperature) maxTemperature,
      AVG(motor_current) avgMotorCurrent, MAX(motor_current) maxMotorCurrent, AVG(alignment) avgAlignment, MAX(alignment) maxAlignment,
      AVG(health_score) avgHealth, MIN(health_score) lowestHealth, MIN(timestamp) firstReading, MAX(timestamp) latestReading
      FROM sensor_readings${f.where}`).get(...f.params);
    const summary = Object.fromEntries(Object.entries(raw).map(([key, val]) => [key, typeof val === "number" && key !== "totalReadings" ? Number(val.toFixed(3)) : val]));
    return {
      summary,
      operatingModes: this.db.prepare(`SELECT source,simulation_mode simulationMode,COUNT(*) count FROM sensor_readings${f.where} GROUP BY source,simulation_mode`).all(...f.params),
      sourceBreakdown: this.db.prepare(`SELECT source,COUNT(*) count FROM sensor_readings${f.where} GROUP BY source`).all(...f.params),
      scope: { source: query.source ?? "ALL", conveyorId: query.conveyorId ?? "ALL", from: query.from ?? null, to: query.to ?? null },
      method: "PROTOTYPE_HEURISTIC", units: { vibration: "m/s² dynamic acceleration RMS (new rows only)", temperature: "°C", motorCurrent: "A", alignment: "mm" },
      legacyWarning: "UNKNOWN rows have unverified source and legacy vibration units; filter by ESP32 or SIMULATOR for interpretable statistics.",
    };
  }

  close() { this.db.close(); }
}
module.exports = Store;
