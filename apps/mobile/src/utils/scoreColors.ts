import { colors } from "../styles/colors";

/**
 * Maps score to color based on verdict ranges:
 * - Unverified: Amber (separate category, no score - insufficient evidence)
 * - ≥85: Green (Verified - evidence overwhelmingly supports)
 * - 40-84: Amber (Disputed - evidence on both sides)
 * - <40: Red (False - evidence contradicts)
 */
export function getScoreColor(score: number, verdict?: string | null): string {
  // Unverified is a separate category without a score
  if (verdict === "Unverified") return colors.warning; // Amber - Unverified
  if (score >= 85) return colors.success; // Green - Verified
  if (score >= 40) return colors.warning; // Amber - Disputed
  return colors.danger; // Red - False
}

// Keeping compatibility with existing code if needed, but updated to use new palette
export function getScoreGradient(score: number, verdict?: string | null): { start: string; end: string } {
  const color = getScoreColor(score, verdict);
  return { start: color, end: color }; // Return solid color as gradient start/end for now
}

export function adjustConfidence(confidence: number): number {
  const adjusted = confidence + 0.075;
  return Math.min(1.0, adjusted);
}
