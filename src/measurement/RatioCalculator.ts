import type { SessionResult, RatioResult } from '../types';
import { kFromN, getEffectiveN } from '../utils/kFactor';

/**
 * Calculator for ratio/percent change with uncertainty propagation
 */
export class RatioCalculator {
  /**
   * Calculate ratio result from base and final session results
   */
  compute(Wbase: SessionResult, Wfinal: SessionResult): RatioResult {
    const Wb = Wbase.fixedValue;
    const Wf = Wfinal.fixedValue;

    // Validation
    if (Wb <= 0) {
      return {
        Wbase,
        Wfinal,
        ratio: 0,
        percent: 0,
        sigmaRatio1Sigma: 0,
        errorBand95Ratio: 0,
        errorBand95Percent: 0,
        relativeErrorPercent95: 0,
        k95: 2.0,
        nEff: 0,
        notes: ['Error: W_base must be > 0 (cannot divide by zero)'],
      };
    }

    // Step 1: Compute ratio and percent
    const ratio = (Wb - Wf) / Wb;
    const percent = 100 * ratio;

    // Step 2: Uncertainty propagation
    const sigmaWb = Wbase.totalUncertainty1Sigma;
    const sigmaWf = Wfinal.totalUncertainty1Sigma;

    // Partial derivatives:
    // d(ratio)/dWb = Wf / (Wb^2)
    // d(ratio)/dWf = -1 / Wb
    const dRatio_dWb = Wf / (Wb * Wb);
    const dRatio_dWf = -1 / Wb;

    // Uncertainty in ratio (assuming Wb and Wf are independent):
    // sigma_ratio = sqrt( (dRatio/dWb * sigmaWb)^2 + (dRatio/dWf * sigmaWf)^2 )
    const sigmaRatio1Sigma = Math.sqrt(
      Math.pow(dRatio_dWb * sigmaWb, 2) + Math.pow(dRatio_dWf * sigmaWf, 2)
    );

    // Step 3: Effective sample size for k interpolation
    const nEff = getEffectiveN(Wbase.nTrim, Wfinal.nTrim);

    // Step 4: k-factor interpolation
    const k95 = kFromN(nEff);

    // Step 5: 95% error band
    const errorBand95Ratio = k95 * sigmaRatio1Sigma;
    const errorBand95Percent = 100 * errorBand95Ratio;

    // Step 6: Relative error (optional)
    const relativeErrorPercent95 = Math.abs(percent) > 0 
      ? (errorBand95Percent / Math.abs(percent)) * 100 
      : 0;

    // Step 7: Notes/warnings
    const notes: string[] = [];
    if (Wbase.nTrim < 3) {
      notes.push(`Low base sample count (${Wbase.nTrim})`);
    }
    if (Wfinal.nTrim < 3) {
      notes.push(`Low final sample count (${Wfinal.nTrim})`);
    }
    if (nEff < 3) {
      notes.push(`Low effective sample count (${nEff}) for k-factor`);
    }
    if (Wbase.tareUncertainty95 === 0 && Wfinal.tareUncertainty95 === 0) {
      notes.push('No tare uncertainty specified for either session');
    }

    return {
      Wbase,
      Wfinal,
      ratio,
      percent,
      sigmaRatio1Sigma,
      errorBand95Ratio,
      errorBand95Percent,
      relativeErrorPercent95,
      k95,
      nEff,
      notes: notes.length > 0 ? notes : undefined,
    };
  }
}

