import { colors } from "../styles/colors";

export function getScoreColor(score: number): string {
  if (score >= 70) return colors.success;
  if (score >= 45) return colors.warning;
  return colors.danger;
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
