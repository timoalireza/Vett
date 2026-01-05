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

  // Remove common attribution phrases + source-y framing.
  t = t.replace(/\baccording to\b/gi, "");
  t = t.replace(/\bexperts say\b/gi, "");
  t = t.replace(/\bsources say\b/gi, "");

  // Avoid awkward "retrieved ..." phrasing in user-facing copy.
  t = t.replace(/\bretrieved\b/gi, "");

  // For replacements that introduce "the available information", strip any preceding article to avoid "the the available information".
  t = t.replace(/\b(?:the|a|an)\s+reports(?:\s+say)?\b/gi, "the available information");
  t = t.replace(/\breports(?:\s+say)?\b/gi, "available information");
  t = t.replace(/\b(?:the|a|an)\s+studies\s+(?:say|show)\b/gi, "the available information indicates");
  t = t.replace(/\bstudies\s+(?:say|show)\b/gi, "available information indicates");
  t = t.replace(/\b(?:the|a|an)\s+multiple\s+sources\b/gi, "the available information");
  t = t.replace(/\bmultiple\s+sources\b/gi, "available information");
  t = t.replace(/\b(?:the|a|an)\s+sources\b/gi, "the available information");
  t = t.replace(/\bsources\b/gi, "available information");
  t = t.replace(/\b(?:the|a|an)\s+evidence\b/gi, "the available information");
  t = t.replace(/\bevidence\b/gi, "available information");

  // Replace corroboration/source-count language with neutral wording.
  t = t.replace(/\bcorroboration\b/gi, "confirmation");
  t = t.replace(/\bindependent sources?\b/gi, "independent confirmation");

  // Replace "true/false" usages outside the verdict label with neutral wording.
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


