import type { TareSample, TareEstimate } from '../types';
import { median } from '../utils/math';

/**
 * Manages tare sample collection and estimation
 */
export class TareManager {
  private samples: TareSample[] = [];

  /**
   * Add a tare reading sample
   */
  addTareSample(value_g: number): void {
    if (isNaN(value_g) || value_g < 0) {
      throw new Error('Invalid tare reading: must be a non-negative number');
    }

    this.samples.push({
      timestamp: Date.now(),
      tareReading: value_g,
    });
  }

  /**
   * Remove a tare sample by index
   */
  removeTareSample(index: number): void {
    if (index >= 0 && index < this.samples.length) {
      this.samples.splice(index, 1);
    }
  }

  /**
   * Clear all tare samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get all tare samples
   */
  getSamples(): TareSample[] {
    return [...this.samples];
  }

  /**
   * Get count of tare samples
   */
  getCount(): number {
    return this.samples.length;
  }

  /**
   * Estimate bias and uncertainty from collected samples
   * Uses half-range method: T95 = (max - min) / 2
   */
  estimate(): TareEstimate {
    const count = this.samples.length;

    if (count === 0) {
      return {
        count: 0,
        biasMedian: 0,
        tareUncertainty95: 0,
        tareSigma: 0,
        method: 'halfRange',
      };
    }

    if (count === 1) {
      const value = this.samples[0].tareReading;
      return {
        count: 1,
        biasMedian: value,
        tareUncertainty95: 0, // Cannot estimate uncertainty from single sample
        tareSigma: 0,
        method: 'halfRange',
      };
    }

    // Extract readings
    const readings = this.samples.map(s => s.tareReading);

    // Bias estimate: median
    const biasMedian = median(readings);

    // Tare uncertainty (95%): half-range method
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    const tareUncertainty95 = (max - min) / 2;

    // Convert to 1σ equivalent: T = T95 / 2
    const tareSigma = tareUncertainty95 / 2;

    return {
      count,
      biasMedian,
      tareUncertainty95,
      tareSigma,
      method: 'halfRange',
    };
  }

  /**
   * Create estimate from user-entered values (manual override)
   */
  static createManualEstimate(bias_g: number, tareUncertainty95_g: number): TareEstimate {
    return {
      count: 0, // Indicates manual entry
      biasMedian: bias_g,
      tareUncertainty95: tareUncertainty95_g,
      tareSigma: tareUncertainty95_g / 2,
      method: 'userEntered',
    };
  }
}

