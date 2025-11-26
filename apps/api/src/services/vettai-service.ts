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
          claim: analysis.rawInput || analysis.claims?.[0]?.text,
          verdict: analysis.verdict,
          score: analysis.score,
          summary: analysis.summary,
          sources: analysis.sources.map((s) => ({ title: s.title, url: s.url }))
        }
      : undefined;

    const systemPrompt = `You are VettAI, a helpful fact-checking assistant. Your role is to help users understand analysis results, explain verdicts, discuss sources, and answer questions about claims.

${context ? `Current Analysis Context:
- Claim: ${context.claim || "N/A"}
- Verdict: ${context.verdict || "N/A"}
- Score: ${context.score ?? "N/A"}
- Summary: ${context.summary || "N/A"}
- Sources: ${context.sources?.map((s) => `- ${s.title} (${s.url})`).join("\n") || "None"}` : ""}

Guidelines:
- Be concise and factual
- Reference the analysis context when relevant
- Explain verdicts and scores clearly
- Help users understand source reliability
- If asked about something not in the analysis, say so politely
- Keep responses under 300 words unless the user asks for more detail`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error: any) {
      console.error("[VettAI] Error generating response:", error);
      throw new Error("Failed to generate VettAI response. Please try again.");
    }
  }
};

