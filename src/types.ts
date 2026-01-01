// Type definitions for IMU-based weighing measurement system

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RawSensorData {
  accelerationIncludingGravity: Vector3 | null;
  rotationRate: Vector3 | null;
  interval: number | null;
  timestamp: number;
}

export interface ProcessedIMUData {
  a_z: number; // Vertical acceleration along gravity (m/s²)
  roll: number; // Roll angle (degrees)
  pitch: number; // Pitch angle (degrees)
  g_est: Vector3; // Estimated gravity vector
  g_unit: Vector3; // Unit gravity vector
  a_lin: Vector3; // Linear acceleration
  timestamp: number;
}

export interface LiveMetrics {
  a_z: number;
  roll: number;
  pitch: number;
  rms_az: number;
  rms_roll: number;
  rms_pitch: number;
  samplingRate: number;
  isStable: boolean;
  confidence: number;
}

export interface TimestampedSample {
  timestamp: number;
  value: number;
}

export interface SessionSample {
  timestamp: number;
  a_z: number;
  roll: number;
  pitch: number;
  scaleReading: number;
  isGood: boolean;
}

export interface SessionData {
  samples: SessionSample[];
  startTime: number;
  endTime: number;
  duration: number;
  rms_az: number;
  rms_roll: number;
  rms_pitch: number;
  percentGood: number;
}

export interface MeasurementResult {
  fixedMeasurement: number; // grams
  confidence: number; // 0..1
  errorBand: number; // ± grams (95% CI)
  relativeError: number; // ± percentage
  isReliable: boolean;
  diagnostics: {
    nTotal: number;
    nGood: number;
    percentGood: number;
    sessionRMS_az: number;
    sessionRMS_roll: number;
    sessionRMS_pitch: number;
    sigma_motion: number;
    sigma_scale: number;
    sigma_total: number;
  };
}

export interface Config {
  // Gating thresholds
  T_az_rms: number; // m/s²
  T_roll_rms: number; // degrees
  T_pitch_rms: number; // degrees
  T_az_instant: number; // m/s²
  T_roll_instant: number; // degrees
  T_pitch_instant: number; // degrees
  
  // Gravity filter
  gravity_filter_alpha: number; // 0.90-0.98
  
  // Defaults
  sample_mass_default: number; // grams
  scale_sample_rate: number; // Hz
  live_window_duration: number; // seconds
  
  // Uncertainty
  uncertainty_k: number;
  g_standard: number; // m/s²
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface SensorStatus {
  permissionGranted: boolean;
  sensorsEnabled: boolean;
  sensorsRunning: boolean;
  permissionStatus: PermissionStatus;
  error: string | null;
}

export interface MeasurementHistoryEntry {
  id: string;
  batchNumber: string;
  timestamp: number; // Unix timestamp
  dateTime: string; // Formatted date/time string
  result: MeasurementResult;
  scaleReading: number;
  bias: number;
  motionCorrectionEnabled: boolean;
}

// Tare management types
export interface TareSample {
  timestamp: number;
  tareReading: number; // grams
}

export interface TareEstimate {
  count: number;
  biasMedian: number; // b (grams)
  tareUncertainty95: number; // T95 (grams, 95% confidence)
  tareSigma: number; // T = T95/2 (1σ equivalent)
  method: 'halfRange' | 'userEntered';
}

// Manual measurement types for base/final sessions
export type SessionKind = 'base' | 'final';

export interface ManualMeasurement {
  timestamp: number;
  kind: SessionKind;
  scaleReading: number; // grams raw
  bias: number; // grams b (locked at session time)
  tareUncertainty95: number; // ±g 95% (locked)
  correctedValue: number; // grams = scaleReading - bias
}

export interface SessionResult {
  kind: SessionKind;
  measurements: ManualMeasurement[];
  nTotal: number;
  nTrim: number;
  trimFraction: number;

  bias: number;
  tareUncertainty95: number; // T95 used
  tareSigma: number; // T = T95/2

  mean: number;
  median: number;
  trimmedMean: number;
  fixedValue: number; // choose trimmedMean if nTrim>=3 else median

  stdDev: number; // sample std dev of corrected values (after trimming)
  stdError: number; // SE = stdDev / sqrt(nTrim)
  totalUncertainty1Sigma: number; // sqrt(SE^2 + T^2)
  errorBand95: number; // k(nTrim) * totalUncertainty1Sigma
  confidence: number; // 0..1 based on nTrim
  k95: number; // interpolated k-factor used
  notes?: string[];
}

export interface RatioResult {
  Wbase: SessionResult;
  Wfinal: SessionResult;

  ratio: number; // (Wb - Wf)/Wb
  percent: number; // 100*ratio

  // uncertainty propagation
  sigmaRatio1Sigma: number;
  errorBand95Ratio: number;
  errorBand95Percent: number;
  relativeErrorPercent95: number; // optional
  k95: number; // interpolated factor used
  nEff: number; // effective n used for k interpolation
  notes?: string[];
}

