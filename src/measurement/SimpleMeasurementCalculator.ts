import type { SimpleMeasurement, SimpleMeasurementResult } from '../types';
import { mean, median, trimmedMean, sampleStdDev } from '../utils/math';

/**
 * Calculator for simple measurement mode with correct uncertainty propagation
 * Uses standard error (SE) combined with tare uncertainty: sqrt(SE² + T²)
 */
export class SimpleMeasurementCalculator {
  private trimFraction: number = 0.10;
  private k95: number = 2.0; // For 95% confidence (approx, could use t-factor for small n)

  constructor(trimFraction: number = 0.10, k95: number = 2.0) {
    this.trimFraction = trimFraction;
    this.k95 = k95;
  }

  /**
   * Calculate final result from measurements
   */
  compute(measurements: SimpleMeasurement[]): SimpleMeasurementResult {
    if (measurements.length === 0) {
      return this.createEmptyResult();
    }

    // Step 1: Extract corrected values
    const correctedValues = measurements
      .map(m => m.correctedValue)
      .filter(v => !isNaN(v) && v > 0 && v < 100000); // Filter invalid

    if (correctedValues.length === 0) {
      return this.createEmptyResult();
    }

    const nTotal = correctedValues.length;

    // Step 2: Sort for trimming
    const sorted = [...correctedValues].sort((a, b) => a - b);

    // Step 3: Trim
    const drop = Math.floor(this.trimFraction * sorted.length);
    const trimmed = sorted.slice(drop, sorted.length - drop);
    const nTrim = trimmed.length;

    if (nTrim === 0) {
      return this.createEmptyResult();
    }

    // Step 4: Compute central tendencies
    const meanValue = mean(trimmed);
    const medianValue = median(trimmed);
    const trimmedMeanValue = trimmedMean(trimmed, 0); // Already trimmed, so no additional trimming

    // Step 5: Fixed value selection
    const fixedValue = nTrim >= 3 ? trimmedMeanValue : medianValue;

    // Step 6: Sample standard deviation on trimmed data
    let stdDevValue = 0;
    if (nTrim >= 2) {
      stdDevValue = sampleStdDev(trimmed);
    }

    // Step 7: Standard Error (SE) = stdDev / sqrt(n)
    let stdError = 0;
    if (nTrim >= 2) {
      stdError = stdDevValue / Math.sqrt(nTrim);
    }

    // Step 8: Tare uncertainty (from locked session values)
    // Use the tare uncertainty from the first measurement (all should be same)
    const tareUncertainty95 = measurements[0].tareUncertainty95;
    const tareSigma = tareUncertainty95 / 2; // Convert 95% to 1σ

    // Step 9: Total 1σ uncertainty
    // sigma_total = sqrt(SE² + T²)
    const totalUncertainty1Sigma = Math.sqrt(stdError * stdError + tareSigma * tareSigma);

    // Step 10: 95% error band
    const errorBand95 = this.k95 * totalUncertainty1Sigma;

    // Step 11: Relative error
    const relativeError95 = fixedValue !== 0 ? (errorBand95 / Math.abs(fixedValue)) * 100 : 0;

    // Step 12: Confidence based on nTrim
    let confidence = 0.3;
    if (nTrim === 2) confidence = 0.5;
    else if (nTrim >= 3) confidence = 0.7;
    else if (nTrim >= 6) confidence = 0.85;
    else if (nTrim >= 10) confidence = 0.95;

    // Optionally weight by average quality score if available
    const qualityScores = measurements
      .map(m => m.qualityScore)
      .filter(s => s !== undefined) as number[];
    if (qualityScores.length > 0) {
      const avgQuality = mean(qualityScores);
      confidence = confidence * (0.5 + 0.5 * avgQuality); // Scale confidence by quality
    }

    // Step 13: Notes/warnings
    const notes: string[] = [];
    if (nTotal === 1) {
      notes.push('Single measurement - no statistical variation');
    }
    if (nTrim < 3) {
      notes.push(`Low sample count (${nTrim}) - using median instead of trimmed mean`);
    }
    if (tareUncertainty95 === 0) {
      notes.push('No tare uncertainty specified');
    }

    return {
      measurementCount: nTotal,
      measurements: [...measurements],

      bias: measurements[0].bias,
      tareUncertainty95,
      tareSigma,

      mean: meanValue,
      median: medianValue,
      trimmedMean: trimmedMeanValue,
      fixedValue,

      stdDev: stdDevValue,
      stdError,
      totalUncertainty1Sigma,
      errorBand95,
      relativeError95,

      nTotal,
      nTrim,
      trimFraction: this.trimFraction,
      confidence,
      notes: notes.length > 0 ? notes : undefined,
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(): SimpleMeasurementResult {
    return {
      measurementCount: 0,
      measurements: [],
      bias: 0,
      tareUncertainty95: 0,
      tareSigma: 0,
      mean: 0,
      median: 0,
      trimmedMean: 0,
      fixedValue: 0,
      stdDev: 0,
      stdError: 0,
      totalUncertainty1Sigma: 0,
      errorBand95: 0,
      relativeError95: 0,
      nTotal: 0,
      nTrim: 0,
      trimFraction: this.trimFraction,
      confidence: 0,
      notes: ['No measurements available'],
    };
  }
}

