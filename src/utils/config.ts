import type { Config } from '../types';

export const DEFAULT_CONFIG: Config = {
  // Gating thresholds
  T_az_rms: 0.35, // m/s²
  T_roll_rms: 2.5, // degrees
  T_pitch_rms: 2.5, // degrees
  T_az_instant: 0.8, // m/s²
  T_roll_instant: 6.0, // degrees
  T_pitch_instant: 6.0, // degrees
  
  // Gravity filter
  gravity_filter_alpha: 0.92, // 0.90-0.98
  
  // Defaults
  sample_mass_default: 150, // grams
  scale_sample_rate: 5, // Hz
  live_window_duration: 5, // seconds
  
  // Uncertainty
  uncertainty_k: 2.0,
  g_standard: 9.80665, // m/s²
};

