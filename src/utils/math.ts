// Math utilities for signal processing and statistics

/**
 * Calculate Root Mean Square (RMS) of an array of values
 */
export function rms(values: number[]): number {
  if (values.length === 0) return 0;
  const sumSquares = values.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSquares / values.length);
}

/**
 * Calculate standard deviation
 */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate median of an array
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate trimmed mean (drop top/bottom percent)
 */
export function trimmedMean(values: number[], trimPercent: number = 0.1): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) return values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(values.length * trimPercent);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  
  if (trimmed.length === 0) return median(values);
  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}

/**
 * Calculate mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate dot product of two 3D vectors
 */
export function dotProduct(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate magnitude (length) of a 3D vector
 */
export function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalize a 3D vector to unit length
 */
export function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

