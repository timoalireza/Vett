import { colors } from "../styles/colors";

/**
 * Epistemic Score Bands
 * 90-100: Strongly Supported (Green)
 * 75-89: Supported (Green-ish)
 * 60-74: Plausible (Amber)
 * 45-59: Mixed (Amber)
 * 30-44: Weakly Supported (Amber-Orange)
 * 15-29: Mostly False (Orange-Red)
 * 0-14: False (Red)
 */
export function getScoreColorFromBand(scoreBand: string): string {
  switch (scoreBand) {
    case "Strongly Supported":
      return colors.success;
    case "Supported":
      return colors.success;
    case "Plausible":
      return colors.warning;
    case "Mixed":
      return colors.warning;
    case "Weakly Supported":
      return "#FF9500"; // Orange
    case "Mostly False":
      return "#FF6B35"; // Orange-Red
    case "False":
      return colors.danger;
    default:
      return colors.warning;
  }
}

/**
 * Maps verdict/score band to color
 * Supports both legacy verdicts and new epistemic score bands
 * 
 * Legacy verdicts: "Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion", "Unverified"
 * Epistemic bands: "Strongly Supported", "Supported", "Plausible", "Mixed", "Weakly Supported", "Mostly False", "False"
 */
export function getScoreColor(score: number, verdict?: string | null, scoreBand?: string | null): string {
  // Prioritize epistemic score band if available
  if (scoreBand) {
    return getScoreColorFromBand(scoreBand);
  }
  
  // Legacy verdict mappings
  if (verdict === "Verified") return colors.success;
  if (verdict === "Mostly Accurate") return colors.warning;
  if (verdict === "Partially Accurate") return colors.warning;
  if (verdict === "Opinion") return colors.warning;
  if (verdict === "False") return colors.danger;
  if (verdict === "Unverified") return colors.warning;
  
  // Score-based fallback using epistemic band thresholds
  if (score >= 90) return colors.success; // Strongly Supported
  if (score >= 75) return colors.success; // Supported
  if (score >= 60) return colors.warning; // Plausible
  if (score >= 45) return colors.warning; // Mixed
  if (score >= 30) return "#FF9500"; // Weakly Supported (Orange)
  if (score >= 15) return "#FF6B35"; // Mostly False (Orange-Red)
  return colors.danger; // False
}

// Get gradient for score visualization
export function getScoreGradient(score: number, verdict?: string | null, scoreBand?: string | null): { start: string; end: string } {
  const color = getScoreColor(score, verdict, scoreBand);
  
  // Create subtle gradient variation
  return { start: color, end: color };
}

export function adjustConfidence(confidence: number): number {
  const adjusted = confidence + 0.075;
  return Math.min(1.0, adjusted);
}

/**
 * Get human-readable label for score band
 */
export function getScoreBandLabel(score: number, scoreBand?: string | null): string {
  if (scoreBand) return scoreBand;
  
  // Fallback based on score
  if (score >= 90) return "Strongly Supported";
  if (score >= 75) return "Supported";
  if (score >= 60) return "Plausible";
  if (score >= 45) return "Mixed";
  if (score >= 30) return "Weakly Supported";
  if (score >= 15) return "Mostly False";
  return "False";
}
