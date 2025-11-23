export function getScoreGradient(score: number, verdict?: string | null): { start: string; end: string } {
  // Check verdict first - "Mostly Accurate" should be green
  if (verdict && verdict.toLowerCase().includes("mostly accurate")) {
    return { start: "#2EFAC0", end: "#53D8FF" }; // Green gradient
  }
  
  // Fallback to score-based colors
  if (score >= 75) {
    return { start: "#2EFAC0", end: "#53D8FF" };
  }
  if (score >= 45) {
    return { start: "#FFC65B", end: "#FF8A5A" };
  }
  return { start: "#FF4D6D", end: "#F45B9A" };
}






