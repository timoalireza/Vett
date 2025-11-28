/**
 * Quality assessment for social media content extraction
 * 
 * Evaluates the quality of extracted content and determines if additional
 * input (like screenshots) would improve analysis accuracy.
 */

export type QualityLevel = "excellent" | "good" | "fair" | "poor" | "insufficient";

export interface QualityAssessment {
  level: QualityLevel;
  score: number; // 0-1, where 1 is perfect
  reasons: string[];
  recommendation?: "screenshot" | "api_key" | "none";
  message?: string;
}

const MIN_WORDS_EXCELLENT = 50;
const MIN_WORDS_GOOD = 30;
const MIN_WORDS_FAIR = 15;
const MIN_WORDS_POOR = 8;

const MIN_UNIQUE_WORDS_RATIO = 0.4; // At least 40% unique words
const MIN_INFORMATION_DENSITY = 0.3; // At least 30% meaningful content

/**
 * Assesses the quality of extracted social media content
 */
export function assessExtractionQuality(
  text: string,
  wordCount: number,
  platform: "twitter" | "x" | "instagram" | "threads" | "facebook" | "tiktok" | "youtube" | "unknown",
  hasAuthor: boolean,
  hasMedia: boolean,
  truncated: boolean
): QualityAssessment {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const uniqueRatio = uniqueWords.size / words.length;

  // Check for low-information patterns
  const hasLowInfoPatterns =
    /^(li\s*){5,}$/i.test(text) ||
    /^\W+$/.test(text) ||
    text.length < 20 ||
    words.length < MIN_WORDS_POOR;

  // Check information density (non-whitespace, non-punctuation ratio)
  const meaningfulChars = text.replace(/[\s\W]/g, "").length;
  const totalChars = text.length;
  const informationDensity = totalChars > 0 ? meaningfulChars / totalChars : 0;

  const reasons: string[] = [];
  let score = 1.0;

  // Word count assessment
  if (wordCount < MIN_WORDS_POOR) {
    score -= 0.4;
    reasons.push(`Very low word count (${wordCount} words)`);
  } else if (wordCount < MIN_WORDS_FAIR) {
    score -= 0.25;
    reasons.push(`Low word count (${wordCount} words)`);
  } else if (wordCount < MIN_WORDS_GOOD) {
    score -= 0.15;
    reasons.push(`Moderate word count (${wordCount} words)`);
  } else if (wordCount < MIN_WORDS_EXCELLENT) {
    score -= 0.05;
  }

  // Unique word ratio
  if (uniqueRatio < MIN_UNIQUE_WORDS_RATIO) {
    score -= 0.2;
    reasons.push(`Low word diversity (${Math.round(uniqueRatio * 100)}% unique)`);
  }

  // Information density
  if (informationDensity < MIN_INFORMATION_DENSITY) {
    score -= 0.15;
    reasons.push(`Low information density (${Math.round(informationDensity * 100)}%)`);
  }

  // Low-information patterns
  if (hasLowInfoPatterns) {
    score -= 0.3;
    reasons.push("Contains low-information patterns");
  }

  // Truncation
  if (truncated) {
    score -= 0.1;
    reasons.push("Content was truncated");
  }

  // Missing metadata
  if (!hasAuthor && (platform === "twitter" || platform === "x" || platform === "instagram" || platform === "threads" || platform === "facebook" || platform === "tiktok" || platform === "youtube")) {
    score -= 0.1;
    reasons.push("Missing author information");
  }

  // Platform-specific checks
  if (platform === "instagram" && !hasMedia) {
    score -= 0.05;
    reasons.push("Instagram post missing media reference");
  }
  
  // Video platforms (TikTok, YouTube Shorts) don't need media flag since they're inherently video
  // Transcription quality is more important than media presence
  if ((platform === "tiktok" || platform === "youtube") && wordCount < MIN_WORDS_FAIR) {
    score -= 0.15;
    reasons.push("Video transcription is very short - may be incomplete");
  }

  // Ensure score is between 0 and 1
  score = Math.max(0, Math.min(1, score));

  // Determine quality level
  let level: QualityLevel;
  if (score >= 0.8) {
    level = "excellent";
  } else if (score >= 0.6) {
    level = "good";
  } else if (score >= 0.4) {
    level = "fair";
  } else if (score >= 0.2) {
    level = "poor";
  } else {
    level = "insufficient";
  }

  // Determine recommendation
  let recommendation: "screenshot" | "api_key" | "none" = "none";
  let message: string | undefined;

  if (level === "insufficient" || level === "poor") {
    if (platform === "twitter" || platform === "x" || platform === "instagram" || platform === "threads" || platform === "facebook") {
      recommendation = "screenshot";
      message = `The extracted content from this ${platform} link is insufficient for accurate analysis. Please upload a screenshot of the post for better results.`;
    } else {
      recommendation = "none";
      message = "Content extraction quality is low. Consider providing additional context.";
    }
  } else if (level === "fair" && (platform === "twitter" || platform === "x" || platform === "instagram" || platform === "threads" || platform === "facebook")) {
    // Suggest API key for better extraction, but also allow screenshot
    recommendation = "api_key";
    message = `Content extraction quality is fair. For better results, consider configuring API credentials for ${platform}, or upload a screenshot of the post.`;
  }

  return {
    level,
    score,
    reasons: reasons.length > 0 ? reasons : ["Content quality is acceptable"],
    recommendation,
    message
  };
}

/**
 * Checks if quality is sufficient for analysis
 */
export function isQualitySufficient(assessment: QualityAssessment): boolean {
  return assessment.level !== "insufficient" && assessment.score >= 0.2;
}

