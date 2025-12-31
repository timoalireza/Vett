import OpenAI from "openai";
import { env } from "../env.js";
import type { AnalysisSummary } from "./analysis-service.js";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY
    })
  : null;

export interface VettAIChatInput {
  message: string;
  analysisId?: string;
}

export interface VettAIChatContext {
  claim?: string;
  verdict?: string;
  score?: number;
  summary?: string;
  sources?: Array<{
    title: string;
    url: string;
    provider: string;
    reliability: number | null;
    summary: string | null;
  }>;
}

// Truncate long context to avoid token limits
const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

// Format source details for the system prompt
const formatSourceDetails = (sources: VettAIChatContext["sources"]): string => {
  if (!sources || sources.length === 0) return "None available.";
  
  return sources.slice(0, 8).map((s, i) => {
    const reliability = s.reliability !== null 
      ? `Reliability: ${Math.round(s.reliability * 100)}%` 
      : "Reliability: Not assessed";
    const summary = s.summary ? truncateText(s.summary, 150) : "No summary";
    return `${i + 1}. ${truncateText(s.title, 80)}
   Provider: ${s.provider}
   ${reliability}
   Summary: ${summary}
   URL: ${s.url}`;
  }).join("\n\n");
};

// Build the system prompt with the calm, neutral analyst persona
const buildSystemPrompt = (context?: VettAIChatContext): string => {
  const basePersona = `You are Vett Chat, a calm and neutral analyst. Your purpose is to help users understand fact-check analysis results through evidence-based discussion.

PERSONA REQUIREMENTS:
- Sound like a calm, neutral analyst
- Be precise, evidence-based, and non-performative
- No emojis, slang, hype, or moral judgment
- No accusations of intent or intelligence
- No absolutes unless evidence is overwhelming
- State uncertainty clearly when present
- One idea per paragraph; use concise reasoning
- Focus on what evidence supports, contradicts, or cannot determine
- Every response should remain credible if read out of context

The goal is to reduce emotional noise and clarify what survives scrutiny.`;

  if (!context) {
    return `${basePersona}

No specific analysis context is available for this conversation.

When responding:
- If the user asks about a specific claim, explain you need more context
- Offer to discuss general fact-checking methodology
- Keep responses concise and factual`;
  }

  const sourcesFormatted = formatSourceDetails(context.sources);

  return `${basePersona}

CURRENT ANALYSIS CONTEXT:

Claim Being Analyzed:
${truncateText(context.claim || "Not specified", 300)}

Analysis Results:
- Verdict: ${context.verdict || "Pending"}
- Confidence Score: ${context.score !== null ? `${context.score}/100` : "Not calculated"}

Summary:
${truncateText(context.summary || "No summary available", 400)}

Sources Used in Analysis:
${sourcesFormatted}

RESPONSE GUIDELINES:
- Reference specific sources by name when discussing evidence
- Explain what each source contributes to the verdict
- Distinguish between what is established, disputed, or unknown
- If asked about information not in the analysis, clearly state this limitation
- Keep responses focused and under 300 words unless the user requests more detail`;
};

export const vettAIService = {
  async chat(input: VettAIChatInput, analysis?: AnalysisSummary | null): Promise<string> {
    if (!openai) {
      throw new Error("OpenAI API key not configured. Vett Chat is unavailable.");
    }

    // Build context from analysis with full source details
    const context: VettAIChatContext | undefined = analysis
      ? {
          claim: analysis.rawInput || analysis.claims?.[0]?.text || undefined,
          verdict: analysis.verdict || undefined,
          score: analysis.score ?? null,
          summary: analysis.summary || undefined,
          sources: (analysis.sources || []).map((s) => ({
            title: s.title || "Untitled",
            url: s.url || "N/A",
            provider: s.provider || "Unknown",
            reliability: s.reliability ?? null,
            summary: s.summary || null
          }))
        }
      : undefined;

    const systemPrompt = buildSystemPrompt(context);

    try {
      // Validate input message length
      if (input.message.length > 1000) {
        throw new Error("Message too long. Please keep questions under 1000 characters.");
      }

      const response = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message.substring(0, 1000) }
          ],
          temperature: 0.5, // Lower temperature for more consistent, analytical responses
          max_tokens: 600
        },
        {
          timeout: 30000 // 30 second timeout
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        return "Unable to generate a response at this time. Please rephrase your question.";
      }

      return content;
    } catch (error: any) {
      console.error("[VettChat] Error generating response:", {
        error: error.message,
        type: error.constructor.name,
        analysisId: input.analysisId
      });

      // Provide more specific error messages
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        throw new Error("Request timed out. Please try again.");
      }
      if (error.status === 429 || error.message?.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
      if (error.status === 401 || error.message?.includes("API key")) {
        throw new Error("Vett Chat is temporarily unavailable. Please try again later.");
      }

      throw new Error("Failed to generate response. Please try again.");
    }
  }
};

