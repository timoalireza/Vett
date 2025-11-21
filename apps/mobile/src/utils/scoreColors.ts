export function getScoreGradient(score: number): { start: string; end: string } {
  if (score >= 75) {
    return { start: "#2EFAC0", end: "#53D8FF" };
  }
  if (score >= 45) {
    return { start: "#FFC65B", end: "#FF8A5A" };
  }
  return { start: "#FF4D6D", end: "#F45B9A" };
}






