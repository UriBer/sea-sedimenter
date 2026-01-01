/**
 * k-factor interpolation based on sample count using t-distribution
 * For 95% confidence interval (two-sided)
 */

// t-distribution table for df = n-1, 95% confidence (two-sided)
// df: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, inf
const T_TABLE: Array<{ df: number; t: number }> = [
  { df: 1, t: 12.706 },
  { df: 2, t: 4.303 },
  { df: 3, t: 3.182 },
  { df: 4, t: 2.776 },
  { df: 5, t: 2.571 },
  { df: 6, t: 2.447 },
  { df: 7, t: 2.365 },
  { df: 8, t: 2.306 },
  { df: 9, t: 2.262 },
  { df: 10, t: 2.228 },
  { df: 12, t: 2.179 },
  { df: 15, t: 2.131 },
  { df: 20, t: 2.086 },
  { df: 25, t: 2.060 },
  { df: 30, t: 2.042 },
  { df: Infinity, t: 1.960 },
];

/**
 * Get k-factor for 95% confidence interval based on sample count
 * Uses t-distribution with linear interpolation
 * 
 * @param n - Sample count (nTrim)
 * @returns k-factor for 95% confidence
 */
export function kFromN(n: number): number {
  if (n <= 1) {
    // Fallback for n=1 (should warn user)
    return 2.0;
  }

  const df = n - 1;

  // If df >= 30, use asymptotic value (1.96) or interpolate towards it
  if (df >= 30) {
    // For df >= 30, interpolate between df=30 (t=2.042) and df=inf (t=1.960)
    if (df >= 100) {
      return 1.960; // Close enough to asymptotic
    }
    // Linear interpolation: t = 2.042 - (df - 30) * (2.042 - 1.960) / (inf - 30)
    // Simplified: t = 2.042 - (df - 30) * 0.082 / 70
    const t30 = 2.042;
    const tInf = 1.960;
    const slope = (t30 - tInf) / 70; // Approximate slope
    return Math.max(1.960, t30 - (df - 30) * slope);
  }

  // Find bracketing values in table
  let lowIdx = 0;
  let highIdx = T_TABLE.length - 1;

  for (let i = 0; i < T_TABLE.length - 1; i++) {
    if (df >= T_TABLE[i].df && df <= T_TABLE[i + 1].df) {
      lowIdx = i;
      highIdx = i + 1;
      break;
    }
  }

  const low = T_TABLE[lowIdx];
  const high = T_TABLE[highIdx];

  // Linear interpolation
  if (low.df === high.df) {
    return low.t;
  }

  const t = low.t + ((df - low.df) * (high.t - low.t)) / (high.df - low.df);
  return t;
}

/**
 * Get effective sample size for ratio calculation
 * Uses minimum of base and final sample counts
 */
export function getEffectiveN(nBase: number, nFinal: number): number {
  return Math.min(nBase, nFinal);
}

