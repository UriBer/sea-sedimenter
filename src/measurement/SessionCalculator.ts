import type { ManualMeasurement, SessionResult, SessionKind } from '../types';
import { mean, median, trimmedMean, sampleStdDev } from '../utils/math';
import { kFromN } from '../utils/kFactor';

/**
 * Calculator for session results (base or final) with k(n) interpolation
 */
export class SessionCalculator {
  private trimFraction: number = 0.10;

  constructor(trimFraction: number = 0.10) {
    this.trimFraction = trimFraction;
  }

  /**
   * Calculate session result from measurements
   */
  compute(measurements: ManualMeasurement[]): SessionResult {
    if (measurements.length === 0) {
      return this.createEmptyResult(measurements[0]?.kind || 'base');
    }

    const kind = measurements[0].kind;

    // Step 1: Extract corrected values
    const correctedValues = measurements
      .map(m => m.correctedValue)
      .filter(v => !isNaN(v) && v > 0 && v < 100000); // Filter invalid

    if (correctedValues.length === 0) {
      return this.createEmptyResult(kind);
    }

    const nTotal = correctedValues.length;

    // Step 2: Sort for trimming
    const sorted = [...correctedValues].sort((a, b) => a - b);

    // Step 3: Trim
    const drop = Math.floor(this.trimFraction * sorted.length);
    const trimmed = sorted.slice(drop, sorted.length - drop);
    const nTrim = trimmed.length;

    if (nTrim === 0) {
      return this.createEmptyResult(kind);
    }

    // Step 4: Compute central tendencies
    const meanValue = mean(trimmed);
    const medianValue = median(trimmed);
    const trimmedMeanValue = trimmedMean(trimmed, 0); // Already trimmed

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
    const tareUncertainty95 = measurements[0].tareUncertainty95;
    const tareSigma = tareUncertainty95 / 2; // Convert 95% to 1σ

    // Step 9: Total 1σ uncertainty
    // sigma_total = sqrt(SE^2 + T^2)
    const totalUncertainty1Sigma = Math.sqrt(stdError * stdError + tareSigma * tareSigma);

    // Step 10: k-factor interpolation based on nTrim
    const k95 = kFromN(nTrim);

    // Step 11: 95% error band
    const errorBand95 = k95 * totalUncertainty1Sigma;

    // Step 12: Confidence based on nTrim
    let confidence = 0.3;
    if (nTrim === 2) confidence = 0.5;
    else if (nTrim >= 3) confidence = 0.7;
    else if (nTrim >= 6) confidence = 0.85;
    else if (nTrim >= 10) confidence = 0.95;

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
    if (nTrim === 1) {
      notes.push('Warning: n=1, k-factor fallback used');
    }

    return {
      kind,
      measurements: [...measurements],
      nTotal,
      nTrim,
      trimFraction: this.trimFraction,
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
      confidence,
      k95,
      notes: notes.length > 0 ? notes : undefined,
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(kind: SessionKind): SessionResult {
    return {
      kind,
      measurements: [],
      nTotal: 0,
      nTrim: 0,
      trimFraction: this.trimFraction,
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
      confidence: 0,
      k95: 2.0,
      notes: ['No measurements available'],
    };
  }
}

