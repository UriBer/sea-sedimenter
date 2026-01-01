import type { ManualMeasurement, SessionKind, TareEstimate } from '../types';

/**
 * Manages manual measurement sessions (base or final)
 */
export class ManualSessionManager {
  private kind: SessionKind;
  private isActive = false;
  private measurements: ManualMeasurement[] = [];
  private lockedBias: number = 0;
  private lockedTareUncertainty95: number = 0;

  constructor(kind: SessionKind) {
    this.kind = kind;
  }

  /**
   * Start a measurement session with locked tare values
   */
  startSession(lockedBias_b: number, lockedTareUnc95_T95: number): void {
    this.isActive = true;
    this.measurements = [];
    this.lockedBias = lockedBias_b;
    this.lockedTareUncertainty95 = lockedTareUnc95_T95;
  }

  /**
   * Add a measurement with current scale reading
   */
  addMeasurement(scaleReading_g: number): void {
    if (!this.isActive) {
      throw new Error(`Session ${this.kind} not active. Call startSession() first.`);
    }

    if (isNaN(scaleReading_g) || scaleReading_g <= 0) {
      throw new Error('Invalid scale reading: must be a positive number');
    }

    const correctedValue = scaleReading_g - this.lockedBias;

    const measurement: ManualMeasurement = {
      timestamp: Date.now(),
      kind: this.kind,
      scaleReading: scaleReading_g,
      bias: this.lockedBias,
      tareUncertainty95: this.lockedTareUncertainty95,
      correctedValue,
    };

    this.measurements.push(measurement);
  }

  /**
   * Remove a measurement by index
   */
  removeMeasurement(index: number): void {
    if (index >= 0 && index < this.measurements.length) {
      this.measurements.splice(index, 1);
    }
  }

  /**
   * Stop the session and return measurements
   */
  stopSession(): ManualMeasurement[] {
    this.isActive = false;
    return [...this.measurements];
  }

  /**
   * Clear all measurements (but keep session active)
   */
  clear(): void {
    this.measurements = [];
  }

  /**
   * Get current measurements
   */
  getMeasurements(): ManualMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get measurement count
   */
  getCount(): number {
    return this.measurements.length;
  }

  /**
   * Check if session is active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Get locked bias
   */
  get bias(): number {
    return this.lockedBias;
  }

  /**
   * Get locked tare uncertainty
   */
  get tareUncertainty95(): number {
    return this.lockedTareUncertainty95;
  }

  /**
   * Check if can calculate (needs at least 1 measurement)
   */
  canCalculate(): boolean {
    return this.measurements.length >= 1;
  }

  /**
   * Get session kind
   */
  get sessionKind(): SessionKind {
    return this.kind;
  }
}

