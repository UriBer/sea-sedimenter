import type { ProcessedIMUData, SessionData, SessionSample, Config } from '../types';
import { rms } from '../utils/math';
import { DEFAULT_CONFIG } from '../utils/config';

export type SessionDataCallback = (data: SessionData) => void;

/**
 * Manages measurement session lifecycle and data collection
 */
export class SessionManager {
  private config: Config;
  private isActive = false;
  private samples: SessionSample[] = [];
  private startTime = 0;
  private endTime = 0;
  
  // Scale reading sampling
  private lastScaleSampleTime = 0;
  private scaleSampleInterval: number;
  private getCurrentScaleReading: () => number;

  private dataCallback: SessionDataCallback | null = null;

  constructor(
    getCurrentScaleReading: () => number,
    config: Config = DEFAULT_CONFIG
  ) {
    this.config = config;
    this.getCurrentScaleReading = getCurrentScaleReading;
    this.scaleSampleInterval = 1000 / config.scale_sample_rate; // ms
  }

  /**
   * Start a measurement session
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.samples = [];
    this.startTime = Date.now();
    this.endTime = 0;
    this.lastScaleSampleTime = 0;
  }

  /**
   * Stop the measurement session and return final data
   */
  stop(): SessionData {
    if (!this.isActive) {
      return this.createEmptySessionData();
    }

    this.isActive = false;
    this.endTime = Date.now();
    const duration = (this.endTime - this.startTime) / 1000; // seconds

    // Calculate session aggregates
    const azValues = this.samples.map(s => s.a_z);
    const rollValues = this.samples.map(s => s.roll);
    const pitchValues = this.samples.map(s => s.pitch);
    const goodSamples = this.samples.filter(s => s.isGood);

    const sessionData: SessionData = {
      samples: [...this.samples],
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      rms_az: rms(azValues),
      rms_roll: rms(rollValues),
      rms_pitch: rms(pitchValues),
      percentGood: this.samples.length > 0 
        ? (goodSamples.length / this.samples.length) * 100 
        : 0,
    };

    if (this.dataCallback) {
      this.dataCallback(sessionData);
    }

    return sessionData;
  }

  /**
   * Add IMU sample to session (called continuously during session)
   */
  addIMUSample(imuData: ProcessedIMUData): void {
    if (!this.isActive) return;

    const now = Date.now();
    
    // Sample scale reading at fixed rate (5 Hz)
    let scaleReading = 0;
    if (now - this.lastScaleSampleTime >= this.scaleSampleInterval) {
      scaleReading = this.getCurrentScaleReading();
      this.lastScaleSampleTime = now;
    } else if (this.samples.length > 0) {
      // Use last scale reading if not time to sample yet
      scaleReading = this.samples[this.samples.length - 1].scaleReading;
    } else {
      scaleReading = this.getCurrentScaleReading();
    }

    // Check if sample is "good" based on instant thresholds
    const isGood =
      Math.abs(imuData.a_z) < this.config.T_az_instant &&
      Math.abs(imuData.roll) < this.config.T_roll_instant &&
      Math.abs(imuData.pitch) < this.config.T_pitch_instant;

    const sample: SessionSample = {
      timestamp: imuData.timestamp,
      a_z: imuData.a_z,
      roll: imuData.roll,
      pitch: imuData.pitch,
      scaleReading,
      isGood,
    };

    this.samples.push(sample);
  }

  /**
   * Get current session progress
   */
  getProgress(): { elapsed: number; sampleCount: number; goodCount: number } {
    if (!this.isActive) {
      return { elapsed: 0, sampleCount: 0, goodCount: 0 };
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const goodCount = this.samples.filter(s => s.isGood).length;

    return {
      elapsed,
      sampleCount: this.samples.length,
      goodCount,
    };
  }

  /**
   * Check if session is active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Reset session (clear data without stopping)
   */
  reset(): void {
    this.samples = [];
    this.startTime = 0;
    this.endTime = 0;
    this.lastScaleSampleTime = 0;
  }

  /**
   * Set callback for session data
   */
  onData(callback: SessionDataCallback): void {
    this.dataCallback = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<Config>): void {
    this.config = { ...this.config, ...config };
    this.scaleSampleInterval = 1000 / this.config.scale_sample_rate;
  }

  private createEmptySessionData(): SessionData {
    return {
      samples: [],
      startTime: 0,
      endTime: 0,
      duration: 0,
      rms_az: 0,
      rms_roll: 0,
      rms_pitch: 0,
      percentGood: 0,
    };
  }
}

