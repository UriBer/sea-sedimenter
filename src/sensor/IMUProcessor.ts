import type { RawSensorData, ProcessedIMUData, LiveMetrics, Config, Vector3 } from '../types';
import { RingBuffer } from '../session/RingBuffer';
import { dotProduct, normalize, magnitude, radToDeg } from '../utils/math';
import { DEFAULT_CONFIG } from '../utils/config';

export type ProcessedDataCallback = (data: ProcessedIMUData) => void;
export type MetricsCallback = (metrics: LiveMetrics) => void;

/**
 * Processes raw IMU data to compute gravity estimate, vertical acceleration, roll/pitch
 */
export class IMUProcessor {
  private config: Config;
  private g_est: Vector3 = { x: 0, y: 0, z: 0 };
  private initialized = false;
  
  // Ring buffers for live RMS windows
  private azBuffer: RingBuffer;
  private rollBuffer: RingBuffer;
  private pitchBuffer: RingBuffer;
  
  // Sample rate estimation
  private lastTimestamp: number = 0;
  private sampleIntervals: number[] = [];
  private maxSampleIntervals = 100;

  private processedCallback: ProcessedDataCallback | null = null;
  private metricsCallback: MetricsCallback | null = null;

  constructor(config: Config = DEFAULT_CONFIG) {
    this.config = config;
    // Estimate buffer size: assume ~100Hz sensor rate, 5s window = 500 samples
    const bufferSize = Math.ceil(100 * config.live_window_duration);
    this.azBuffer = new RingBuffer(bufferSize);
    this.rollBuffer = new RingBuffer(bufferSize);
    this.pitchBuffer = new RingBuffer(bufferSize);
  }

  /**
   * Process raw sensor data
   */
  process(rawData: RawSensorData): void {
    if (!rawData.accelerationIncludingGravity) return;

    const a_incG = rawData.accelerationIncludingGravity;
    const timestamp = rawData.timestamp;

    // Initialize gravity estimate on first sample
    if (!this.initialized) {
      this.g_est = { ...a_incG };
      this.initialized = true;
      this.lastTimestamp = timestamp;
      return;
    }

    // Update gravity estimate using low-pass filter
    const alpha = this.config.gravity_filter_alpha;
    this.g_est = {
      x: alpha * this.g_est.x + (1 - alpha) * a_incG.x,
      y: alpha * this.g_est.y + (1 - alpha) * a_incG.y,
      z: alpha * this.g_est.z + (1 - alpha) * a_incG.z,
    };

    // Compute linear acceleration
    const a_lin: Vector3 = {
      x: a_incG.x - this.g_est.x,
      y: a_incG.y - this.g_est.y,
      z: a_incG.z - this.g_est.z,
    };

    // Compute unit gravity vector
    const g_unit = normalize(this.g_est);

    // Compute vertical acceleration along gravity
    const a_z = dotProduct(a_lin, g_unit);

    // Compute roll and pitch from gravity vector (no magnetometer)
    // Pitch: rotation around y-axis
    const pitch = Math.atan2(-g_unit.x, Math.sqrt(g_unit.y * g_unit.y + g_unit.z * g_unit.z));
    // Roll: rotation around x-axis
    const roll = Math.atan2(g_unit.y, g_unit.z);

    const pitchDeg = radToDeg(pitch);
    const rollDeg = radToDeg(roll);

    // Store in buffers for RMS calculation
    this.azBuffer.push(a_z, timestamp);
    this.rollBuffer.push(rollDeg, timestamp);
    this.pitchBuffer.push(pitchDeg, timestamp);

    // Estimate sampling rate
    if (this.lastTimestamp > 0) {
      const interval = timestamp - this.lastTimestamp;
      this.sampleIntervals.push(interval);
      if (this.sampleIntervals.length > this.maxSampleIntervals) {
        this.sampleIntervals.shift();
      }
    }
    this.lastTimestamp = timestamp;

    // Create processed data
    const processed: ProcessedIMUData = {
      a_z,
      roll: rollDeg,
      pitch: pitchDeg,
      g_est: { ...this.g_est },
      g_unit: { ...g_unit },
      a_lin: { ...a_lin },
      timestamp,
    };

    // Emit processed data
    if (this.processedCallback) {
      this.processedCallback(processed);
    }

    // Compute and emit live metrics
    this.updateMetrics();
  }

  /**
   * Update and emit live metrics
   */
  private updateMetrics(): void {
    const windowMs = this.config.live_window_duration * 1000;
    const rms_az = this.azBuffer.getRMSInWindow(windowMs);
    const rms_roll = this.rollBuffer.getRMSInWindow(windowMs);
    const rms_pitch = this.pitchBuffer.getRMSInWindow(windowMs);

    // Get current values
    const azValues = this.azBuffer.getValues();
    const rollValues = this.rollBuffer.getValues();
    const pitchValues = this.pitchBuffer.getValues();

    const current_az = azValues.length > 0 ? azValues[azValues.length - 1] : 0;
    const current_roll = rollValues.length > 0 ? rollValues[rollValues.length - 1] : 0;
    const current_pitch = pitchValues.length > 0 ? pitchValues[pitchValues.length - 1] : 0;

    // Estimate sampling rate
    let samplingRate = 0;
    if (this.sampleIntervals.length > 0) {
      const avgInterval = this.sampleIntervals.reduce((sum, val) => sum + val, 0) / this.sampleIntervals.length;
      samplingRate = avgInterval > 0 ? 1000 / avgInterval : 0;
    }

    // Gating: check if stable
    const isStable =
      rms_az < this.config.T_az_rms &&
      rms_roll < this.config.T_roll_rms &&
      rms_pitch < this.config.T_pitch_rms;

    // Compute confidence score (0..1) based on RMS metrics
    const azConf = Math.max(0, 1 - rms_az / (this.config.T_az_rms * 2));
    const rollConf = Math.max(0, 1 - rms_roll / (this.config.T_roll_rms * 2));
    const pitchConf = Math.max(0, 1 - rms_pitch / (this.config.T_pitch_rms * 2));
    const confidence = (azConf + rollConf + pitchConf) / 3;

    const metrics: LiveMetrics = {
      a_z: current_az,
      roll: current_roll,
      pitch: current_pitch,
      rms_az,
      rms_roll,
      rms_pitch,
      samplingRate,
      isStable,
      confidence,
    };

    if (this.metricsCallback) {
      this.metricsCallback(metrics);
    }
  }

  /**
   * Set callback for processed data
   */
  onProcessed(callback: ProcessedDataCallback): void {
    this.processedCallback = callback;
  }

  /**
   * Set callback for live metrics
   */
  onMetrics(callback: MetricsCallback): void {
    this.metricsCallback = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<Config>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.initialized = false;
    this.g_est = { x: 0, y: 0, z: 0 };
    this.azBuffer.clear();
    this.rollBuffer.clear();
    this.pitchBuffer.clear();
    this.sampleIntervals = [];
    this.lastTimestamp = 0;
  }
}

