class HardwareAdapter {
  constructor() { this.samples = []; this.previousTime = null; }
  reset() { this.samples = []; this.previousTime = null; }
  normalize(measurement, config, belt) {
    const h = config.hardware;
    if (this.previousTime !== null && measurement.time_ms < this.previousTime) this.reset();
    this.previousTime = measurement.time_ms;
    let vibration = null;
    const axes = [measurement.accel_x, measurement.accel_y, measurement.accel_z];
    if (measurement.adxl345_ok === true && axes.every(v => typeof v === "number" && Number.isFinite(v))) {
      this.samples.push(axes); this.samples = this.samples.slice(-20);
      if (this.samples.length === 20) {
        const mean = [0, 1, 2].map(i => this.samples.reduce((sum, p) => sum + p[i], 0) / this.samples.length);
        vibration = Math.sqrt(this.samples.reduce((sum, p) => sum + p.reduce((s, v, i) => s + (v - mean[i]) ** 2, 0), 0) / this.samples.length);
      }
    } else { this.samples = []; }
    const left = measurement.left_tof_ok === true ? measurement.left_tof_mm : null;
    const right = measurement.right_tof_ok === true ? measurement.right_tof_mm : null;
    return {
      conveyorId: "CB-01", source: "ESP32", vibration,
      temperature: measurement.mlx90614_ok === true ? measurement.object_temp : null,
      motorCurrent: h.currentMeasurementValid && measurement.ina219_ok === true && measurement.current_ma !== null ? Math.abs(measurement.current_ma) / 1000 : null,
      alignmentLeft: left, alignmentRight: right,
      alignment: h.alignmentCalibrated && left !== null && right !== null ? Math.abs(left - right - h.alignmentOffsetMm) : null,
      rpm: measurement.encoder_rpm,
      beltSpeed: h.geometryCalibrated && measurement.encoder_rpm !== null ? Math.abs(measurement.encoder_rpm) / 60 * Math.PI * h.rollerDiameterMeters : null,
      beltPosition: h.geometryCalibrated && belt?.connected ? belt.beltPositionMeters : null,
      emergencyStop: measurement.motor_estop_latched === true,
    };
  }
}
module.exports = HardwareAdapter;
