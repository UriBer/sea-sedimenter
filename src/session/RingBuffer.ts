import type { TimestampedSample } from '../types';
import { rms } from '../utils/math';

/**
 * Efficient circular buffer for timestamped samples
 * Used for live RMS windows and session data collection
 */
export class RingBuffer {
  private buffer: TimestampedSample[];
  private capacity: number;
  private writeIndex: number;
  private count: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.writeIndex = 0;
    this.count = 0;
  }

  /**
   * Add a sample to the buffer (overwrites oldest if full)
   */
  push(value: number, timestamp: number): void {
    this.buffer[this.writeIndex] = { value, timestamp };
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Get all current samples in chronological order
   */
  getSamples(): TimestampedSample[] {
    if (this.count === 0) return [];
    
    const samples: TimestampedSample[] = [];
    if (this.count < this.capacity) {
      // Buffer not full yet, return from start
      for (let i = 0; i < this.count; i++) {
        samples.push(this.buffer[i]);
      }
    } else {
      // Buffer is full, return from writeIndex to end, then start to writeIndex
      for (let i = this.writeIndex; i < this.capacity; i++) {
        samples.push(this.buffer[i]);
      }
      for (let i = 0; i < this.writeIndex; i++) {
        samples.push(this.buffer[i]);
      }
    }
    return samples;
  }

  /**
   * Get values only (for RMS calculation)
   */
  getValues(): number[] {
    return this.getSamples().map(s => s.value);
  }

  /**
   * Get samples within a time window (relative to most recent sample)
   */
  getSamplesInWindow(windowDurationMs: number): TimestampedSample[] {
    const samples = this.getSamples();
    if (samples.length === 0) return [];
    
    const mostRecentTime = samples[samples.length - 1].timestamp;
    const cutoffTime = mostRecentTime - windowDurationMs;
    
    return samples.filter(s => s.timestamp >= cutoffTime);
  }

  /**
   * Calculate RMS of values in a time window
   */
  getRMSInWindow(windowDurationMs: number): number {
    const windowSamples = this.getSamplesInWindow(windowDurationMs);
    if (windowSamples.length === 0) return 0;
    return rms(windowSamples.map(s => s.value));
  }

  /**
   * Calculate RMS of all current samples
   */
  getRMS(): number {
    return rms(this.getValues());
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.writeIndex = 0;
    this.count = 0;
  }

  /**
   * Get current number of samples
   */
  get length(): number {
    return this.count;
  }

  /**
   * Check if buffer is full
   */
  get isFull(): boolean {
    return this.count === this.capacity;
  }
}

