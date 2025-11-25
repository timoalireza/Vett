export function getScoreGradient(score: number, verdict?: string | null): { start: string; end: string } {
  // Check verdict first - "Mostly Accurate" should be green/blue
  if (verdict && verdict.toLowerCase().includes("mostly accurate")) {
    return { start: "#2EFAC0", end: "#53D8FF" }; // Cyan/Blue gradient
  }
  
  // Fallback to score-based colors
  // Scores 70+ should be blue/green (good)
  if (score >= 70) {
    return { start: "#2EFAC0", end: "#53D8FF" }; // Cyan/Blue gradient
  }
  // Scores 45-69 should be orange/yellow (moderate)
  if (score >= 45) {
    return { start: "#FFC65B", end: "#FF8A5A" }; // Orange gradient
  }
  // Scores below 45 should be red/pink (poor)
  return { start: "#FF4D6D", end: "#F45B9A" }; // Red/Pink gradient
}

/**
 * Adjusts confidence score by increasing it by 5-10% (average 7.5%)
 * and capping at 100%. This provides a more optimistic display.
 * 
 * @param confidence - Confidence value between 0 and 1
 * @returns Adjusted confidence value between 0 and 1 (capped at 1.0)
 * 
 * @example
 * adjustConfidence(0.95) // Returns 1.0 (100%)
 * adjustConfidence(0.90) // Returns 0.975 (97.5%)
 * adjustConfidence(0.85) // Returns 0.925 (92.5%)
 */
export function adjustConfidence(confidence: number): number {
  // Increase by 7.5% (average of 5-10% range)
  const adjusted = confidence + 0.075;
  // Cap at 100%
  return Math.min(1.0, adjusted);
}






