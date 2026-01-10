/**
 * UX copy normalization helpers for the mobile "Summary" and "Context" cards.
 *
 * Goals:
 * - Short, plain language.
 * - Avoid attribution language ("sources say", "reports", "evidence") in user-facing cards.
 * - Enforce "Verdict: <LABEL> — ..." prefix for Summary.
 */

export function cleanupTextBlock(text: string): string {
  return String(text ?? "").replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
}

export function limitSentences(text: string, maxSentences: number): string {
  const t = cleanupTextBlock(text);
  const sentenceMatches = t.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!sentenceMatches) return t;
  if (sentenceMatches.length <= maxSentences) return t;
  return sentenceMatches.slice(0, maxSentences).join("").trim();
}

export function deAttribution(text: string): string {
  let t = cleanupTextBlock(text);

  // Preserve a leading verdict prefix if present (we'll reattach it unchanged).
  const verdictPrefixMatch = t.match(
    /^Verdict:\s*(Verified|Mostly Accurate|Partially Accurate|False|Unverified)\s*[—-]\s*/i
  );
  const preservedPrefix = verdictPrefixMatch?.[0] ?? "";
  if (preservedPrefix) t = t.slice(preservedPrefix.length);

  // Remove attribution phrases completely (these are typically filler)
  t = t.replace(/\baccording to\s+[^,.\n]+[,.]?\s*/gi, "");
  t = t.replace(/\b(experts|sources)\s+say\s+(that\s+)?/gi, "");
  t = t.replace(/\bretrieved\s+/gi, "");

  // Handle numbered sources - transform the whole phrase to avoid "3 available information"
  // "3 sources confirm" -> "This is confirmed"
  // "Multiple sources suggest" -> "It is suggested"
  t = t.replace(/\b\d+\s+sources?\s+(confirm|support|indicate|suggest|show)s?\b/gi, "This is $1ed");
  t = t.replace(/\bmultiple\s+sources?\s+(confirm|support|indicate|suggest|show)s?\b/gi, "This is $1ed");
  t = t.replace(/\bseveral\s+sources?\s+(confirm|support|indicate|suggest|show)s?\b/gi, "This is $1ed");

  // Handle specific phrases where replacement is grammatical
  t = t.replace(/\bsources\s+indicate\s+that\b/gi, "indications suggest that");
  t = t.replace(/\bsources\s+suggest\s+that\b/gi, "it appears that");
  t = t.replace(/\bevidence\s+suggests\s+that\b/gi, "it appears that");
  t = t.replace(/\bevidence\s+indicates\s+that\b/gi, "it appears that");
  t = t.replace(/\bthe\s+available\s+evidence\b/gi, "available information");

  // Handle "reports say/show" patterns
  t = t.replace(/\breports\s+(say|show|indicate|suggest)\s+(that\s+)?/gi, "it appears that ");
  t = t.replace(/\bstudies\s+(say|show|indicate|suggest)\s+(that\s+)?/gi, "research indicates that ");

  // DON'T do blanket replacement of "sources" or "evidence" - leave them in other contexts
  // This avoids creating broken phrases like "3 available information"

  // Replace corroboration language with neutral wording
  t = t.replace(/\bindependent\s+corroboration\b/gi, "independent confirmation");
  t = t.replace(/\bcorroborated\s+by\b/gi, "confirmed by");
  t = t.replace(/\bcorroboration\b/gi, "confirmation");

  // Replace "true/false" usages outside the verdict label with neutral wording
  t = t.replace(/\b(this claim is|the claim is)\s+false\b/gi, "$1 not supported");
  t = t.replace(/\b(this claim is|the claim is)\s+true\b/gi, "$1 supported");
  t = t.replace(/\bnot true\b/gi, "not supported");
  t = t.replace(/\bnot false\b/gi, "supported");

  return cleanupTextBlock(preservedPrefix + t);
}

function defaultSummaryBodyForVerdict(verdict: string): string {
  switch (verdict) {
    case "Verified":
      return "This claim matches the available information.";
    case "Mostly Accurate":
      return "This claim is broadly right but misses important nuance.";
    case "Partially Accurate":
      return "This claim mixes accurate details with key errors or gaps.";
    case "False":
      return "This claim conflicts with the available information.";
    case "Opinion":
      return "This is largely subjective, not a clear factual claim.";
    case "Unverified":
    default:
      return "There isn’t enough solid information to assess this claim.";
  }
}

export function normalizeSummary(verdict: string, summary: string): string {
  const cleanedSummaryRaw = deAttribution(summary);
  const body = cleanupTextBlock(
    cleanedSummaryRaw.replace(
      /^Verdict:\s*(Verified|Mostly Accurate|Partially Accurate|False|Unverified)\s*[—-]\s*/i,
      ""
    )
  );
  const safeBody = body.length > 0 ? body : defaultSummaryBodyForVerdict(verdict);
  return limitSentences(`Verdict: ${verdict} — ${safeBody}`, 3);
}

export function normalizeContext(text: string): string {
  const cleaned = deAttribution(text);
  return limitSentences(cleaned, 5);
}


