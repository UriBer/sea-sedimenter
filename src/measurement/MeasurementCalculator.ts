import type { SessionData, MeasurementResult, Config } from '../types';
import { median, trimmedMean, stdDev } from '../utils/math';
import { DEFAULT_CONFIG } from '../utils/config';

/**
 * Computes final fixed measurement from session data with motion correction and uncertainty
 */
export class MeasurementCalculator {
  private config: Config;

  constructor(config: Config = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Compute final measurement from session data
   */
  compute(
    sessionData: SessionData,
    bias: number = 0,
    motionCorrectionEnabled: boolean = true
  ): MeasurementResult {
    if (sessionData.samples.length === 0) {
      return this.createEmptyResult();
    }

    // Step 1: Preprocess scale readings
    const rawReadings = sessionData.samples
      .map(s => s.scaleReading)
      .filter(r => !isNaN(r) && r > 0 && r < 100000); // Remove invalid readings

    if (rawReadings.length === 0) {
      return this.createEmptyResult();
    }

    // Subtract bias
    const readings = rawReadings.map(r => r - bias);

    // Step 2: Motion correction (if enabled)
    let correctedReadings: number[] = [];
    if (motionCorrectionEnabled) {
      correctedReadings = sessionData.samples
        .map((sample, idx) => {
          if (idx >= readings.length) return NaN;
          const reading = readings[idx];
          const a_z = sample.a_z;
          const g = this.config.g_standard;
          
          // corrected = s * g / (g + a_z)
          if (g + a_z === 0) return reading; // Avoid division by zero
          return reading * g / (g + a_z);
        })
        .filter(r => !isNaN(r) && r > 0);
    } else {
      correctedReadings = readings;
    }

    if (correctedReadings.length === 0) {
      return this.createEmptyResult();
    }

    // Step 3: Filter to "good" samples (hard filter)
    const goodSamples = sessionData.samples.filter(s => s.isGood);
    const goodCorrectedReadings: number[] = [];
    
    for (let i = 0; i < sessionData.samples.length && i < correctedReadings.length; i++) {
      if (sessionData.samples[i].isGood) {
        goodCorrectedReadings.push(correctedReadings[i]);
      }
    }

    // Use good samples if we have enough, otherwise use all
    const samplesToUse = goodCorrectedReadings.length >= 3 
      ? goodCorrectedReadings 
      : correctedReadings;
    
    const nGood = goodCorrectedReadings.length;
    const nTotal = correctedReadings.length;

    // Step 4: Robust aggregation
    let fixedMeasurement: number;
    let confidence: number;

    if (samplesToUse.length >= 3) {
      // Use trimmed mean as primary estimate
      fixedMeasurement = trimmedMean(samplesToUse, 0.1);
      // Fallback to median if trimmed mean seems off
      const med = median(samplesToUse);
      if (Math.abs(fixedMeasurement - med) > med * 0.1) {
        fixedMeasurement = med;
      }
      
      // Confidence based on sample quality and consistency
      const percentGood = (nGood / nTotal) * 100;
      const std = stdDev(samplesToUse);
      const cv = std / fixedMeasurement; // Coefficient of variation
      
      // Confidence combines: % good samples, low variance, sufficient samples
      const qualityScore = Math.min(1, percentGood / 80); // 80%+ good = full score
      const consistencyScore = Math.max(0, 1 - cv * 10); // Low CV = high consistency
      const sampleCountScore = Math.min(1, samplesToUse.length / 20); // 20+ samples = full score
      
      confidence = (qualityScore * 0.4 + consistencyScore * 0.4 + sampleCountScore * 0.2);
      confidence = Math.max(0, Math.min(1, confidence));
    } else {
      // Insufficient samples
      fixedMeasurement = median(samplesToUse);
      confidence = Math.max(0, samplesToUse.length / 10); // Very low confidence
    }

    // Step 5: Uncertainty / Error Band
    const sigma_a = sessionData.rms_az; // RMS of a_z during session
    const sigma_s = stdDev(samplesToUse); // Std dev of corrected samples

    // Relative motion error
    const rel_motion = (this.config.uncertainty_k * sigma_a) / this.config.g_standard;
    const sigma_motion_g = fixedMeasurement * rel_motion;
    
    // Total uncertainty
    const sigma_total_g = Math.sqrt(sigma_motion_g * sigma_motion_g + sigma_s * sigma_s);
    
    // 95% confidence interval
    const errorBand = 2 * sigma_total_g;
    const relativeError = fixedMeasurement > 0 
      ? (errorBand / fixedMeasurement) * 100 
      : 0;

    // Reliability check
    const isReliable = 
      confidence > 0.3 &&
      nGood >= 3 &&
      errorBand < fixedMeasurement * 0.1 && // Error < 10% of measurement
      sessionData.rms_az < this.config.T_az_rms * 2; // Not too unstable

    const result: MeasurementResult = {
      fixedMeasurement,
      confidence,
      errorBand,
      relativeError,
      isReliable,
      diagnostics: {
        nTotal: nTotal,
        nGood: nGood,
        percentGood: (nGood / nTotal) * 100,
        sessionRMS_az: sessionData.rms_az,
        sessionRMS_roll: sessionData.rms_roll,
        sessionRMS_pitch: sessionData.rms_pitch,
        sigma_motion: sigma_motion_g,
        sigma_scale: sigma_s,
        sigma_total: sigma_total_g,
      },
    };

    return result;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<Config>): void {
    this.config = { ...this.config, ...config };
  }

  private createEmptyResult(): MeasurementResult {
    return {
      fixedMeasurement: 0,
      confidence: 0,
      errorBand: 0,
      relativeError: 0,
      isReliable: false,
      diagnostics: {
        nTotal: 0,
        nGood: 0,
        percentGood: 0,
        sessionRMS_az: 0,
        sessionRMS_roll: 0,
        sessionRMS_pitch: 0,
        sigma_motion: 0,
        sigma_scale: 0,
        sigma_total: 0,
      },
    };
  }
}

