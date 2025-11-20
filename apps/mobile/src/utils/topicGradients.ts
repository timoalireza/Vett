type TopicKey = "politics" | "health" | "science" | "media" | "general";

// Topic-based colors: red for politics, green for health, etc.
const gradients: Record<TopicKey, [string, string]> = {
  politics: ["#FF4444", "#FF6B6B"], // Red
  health: ["#2EFAC0", "#4AFFD4"], // Green/Teal
  science: ["#4A9EFF", "#6BB3FF"], // Blue
  media: ["#C8A6FF", "#E0C4FF"], // Purple
  general: ["#5AE0A3", "#7BFFC4"] // Teal/Green
};

export function getTopicGradient(topic?: string): [string, string] {
  const normalized = (topic ?? "").toLowerCase();
  if (normalized.includes("politic")) return gradients.politics;
  if (normalized.includes("health")) return gradients.health;
  if (normalized.includes("science")) return gradients.science;
  if (normalized.includes("media")) return gradients.media;
  return gradients.general;
}


