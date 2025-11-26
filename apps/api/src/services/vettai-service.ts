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
  sources?: Array<{ title: string; url: string }>;
}

export const vettAIService = {
  async chat(input: VettAIChatInput, analysis?: AnalysisSummary | null): Promise<string> {
    if (!openai) {
      throw new Error("OpenAI API key not configured. VettAI is unavailable.");
    }

    const context = analysis
      ? {
          claim: analysis.rawInput || analysis.claims?.[0]?.text || "N/A",
          verdict: analysis.verdict || "N/A",
          score: analysis.score ?? null,
          summary: analysis.summary || "N/A",
          sources: (analysis.sources || []).map((s) => ({ title: s.title || "Untitled", url: s.url || "N/A" }))
        }
      : undefined;

    // Truncate long context to avoid token limits
    const truncateText = (text: string, maxLength: number) => {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + "...";
    };

    const sourcesText = context?.sources && context.sources.length > 0
      ? context.sources.slice(0, 5).map((s) => `- ${truncateText(s.title, 80)} (${s.url})`).join("\n")
      : "None";

    const systemPrompt = `You are VettAI, a helpful fact-checking assistant. Your role is to help users understand analysis results, explain verdicts, discuss sources, and answer questions about claims.

${context ? `Current Analysis Context:
- Claim: ${truncateText(context.claim || "N/A", 200)}
- Verdict: ${context.verdict || "N/A"}
- Score: ${context.score ?? "N/A"}
- Summary: ${truncateText(context.summary || "N/A", 300)}
- Sources: ${sourcesText}` : ""}

Guidelines:
- Be concise and factual
- Reference the analysis context when relevant
- Explain verdicts and scores clearly
- Help users understand source reliability
- If asked about something not in the analysis, say so politely
- Keep responses under 300 words unless the user asks for more detail`;

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
          temperature: 0.7,
          max_tokens: 500
        },
        {
          timeout: 30000 // 30 second timeout
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        return "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
      }

      return content;
    } catch (error: any) {
      console.error("[VettAI] Error generating response:", {
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
        throw new Error("VettAI is temporarily unavailable. Please try again later.");
      }

      throw new Error("Failed to generate VettAI response. Please try again.");
    }
  }
};

