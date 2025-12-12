import { colors } from "../styles/colors";

/**
 * Maps verdict to color, respecting server verdicts first before falling back to score
 * Server verdicts: "Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion", "Unverified"
 * - Verified: Green (evidence overwhelmingly supports)
 * - Mostly Accurate/Partially Accurate/Opinion: Amber (mixed/partial/subjective)
 * - False: Red (evidence contradicts)
 * - Unverified: Amber (insufficient evidence, no score)
 */
export function getScoreColor(score: number, verdict?: string | null): string {
  // Prioritize explicit verdict mappings over score-based logic
  if (verdict === "Verified") return colors.success; // Green
  if (verdict === "Mostly Accurate") return colors.warning; // Amber
  if (verdict === "Partially Accurate") return colors.warning; // Amber
  if (verdict === "Opinion") return colors.warning; // Amber
  if (verdict === "False") return colors.danger; // Red
  if (verdict === "Unverified") return colors.warning; // Amber
  
  // Fallback to score-based logic only if verdict is null/undefined
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
