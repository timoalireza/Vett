import { perplexity } from "../clients/perplexity.js";

export interface RealtimeVerificationInput {
  claim: string;
  context?: string;
}

export interface RealtimeVerificationResult {
  summary: string;
  verdict: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "FALSE" | "NEEDS_CONTEXT";
  confidence: number;
  citations: string[];
  reasoning: string;
}

/**
 * Perform real-time fact verification using Perplexity's web search capabilities
 * This is a lightweight, fast verification for quick checks
 */
export async function verifyClaimRealtime(
  input: RealtimeVerificationInput
): Promise<RealtimeVerificationResult> {
  if (!perplexity) {
    throw new Error("Real-time verification is not available. Please try again later.");
  }

  try {
    const systemPrompt = `You are a fact-checking assistant. Analyze the given claim using current, reliable sources.

Provide your response in this exact format:

VERDICT: [Choose ONE: VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, FALSE, or NEEDS_CONTEXT]
CONFIDENCE: [Number from 0-100]

SUMMARY:
[2-3 sentences summarizing what you found]

REASONING:
[Explain your verdict based on the sources you found. Reference specific sources. Be clear about what is confirmed, what is disputed, and what cannot be determined.]

Guidelines:
- VERIFIED: Strong evidence supports the claim
- PARTIALLY_VERIFIED: Some aspects are accurate, others are not or lack evidence
- UNVERIFIED: Insufficient evidence to confirm or deny
- FALSE: Strong evidence contradicts the claim
- NEEDS_CONTEXT: The claim requires additional context or clarification to assess
- Be precise and neutral
- Cite specific sources
- State limitations clearly`;

    const userPrompt = input.context
      ? `Context: ${input.context}\n\nClaim to verify: "${input.claim}"`
      : `Claim to verify: "${input.claim}"`;

    const response = await perplexity.chat({
      model: "llama-3.1-sonar-large-128k-online",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.2,
      return_citations: true,
      search_recency_filter: "month"
    });

    const content = response.choices[0]?.message?.content || "";
    const citations = response.citations || [];

    // Parse the structured response
    const verdictMatch = content.match(/VERDICT:\s*([A-Z_]+)/i);
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    const summaryMatch = content.match(/SUMMARY:\s*\n([\s\S]*?)(?=\n\nREASONING:|$)/i);
    const reasoningMatch = content.match(/REASONING:\s*\n([\s\S]*?)$/i);

    const verdictText = verdictMatch?.[1]?.toUpperCase() || "NEEDS_CONTEXT";
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 50;
    const summary = summaryMatch?.[1]?.trim() || "Unable to generate summary.";
    const reasoning = reasoningMatch?.[1]?.trim() || content;

    // Validate verdict
    const validVerdicts = ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "FALSE", "NEEDS_CONTEXT"];
    const verdict = validVerdicts.includes(verdictText)
      ? (verdictText as RealtimeVerificationResult["verdict"])
      : "NEEDS_CONTEXT";

    return {
      summary,
      verdict,
      confidence: Math.min(Math.max(confidence, 0), 100),
      citations,
      reasoning
    };
  } catch (error: any) {
    console.error("[RealtimeVerification] Error:", error.message);
    throw new Error("Failed to verify claim. Please try again.");
  }
}

