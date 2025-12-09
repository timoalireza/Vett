import { colors } from "../styles/colors";

/**
 * Maps score to color based on ranges:
 * - ≥70: Green (success)
 * - 45-69: Amber (warning)
 * - <45: Red (danger)
 */
export function getScoreColor(score: number): string {
  if (score >= 70) return colors.success; // Green
  if (score >= 45) return colors.warning; // Amber (45-69)
  return colors.danger; // Red (<45)
}

// Keeping compatibility with existing code if needed, but updated to use new palette
export function getScoreGradient(score: number, verdict?: string | null): { start: string; end: string } {
  const color = getScoreColor(score);
  return { start: color, end: color }; // Return solid color as gradient start/end for now
}

export function adjustConfidence(confidence: number): number {
  const adjusted = confidence + 0.075;
  return Math.min(1.0, adjusted);
}
