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

