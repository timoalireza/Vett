import { env } from "../env.js";

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityCitation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PerplexityRequestOptions {
  model?: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  return_citations?: boolean;
  return_images?: boolean;
  search_domain_filter?: string[];
  search_recency_filter?: "day" | "week" | "month" | "year";
}

class PerplexityClient {
  private apiKey: string;
  private baseURL = "https://api.perplexity.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(options: PerplexityRequestOptions): Promise<PerplexityResponse> {
    const {
      model = "llama-3.1-sonar-large-128k-online",
      messages,
      max_tokens = 1024,
      temperature = 0.2,
      top_p = 0.9,
      return_citations = true,
      return_images = false,
      search_domain_filter,
      search_recency_filter
    } = options;

    const requestBody: any = {
      model,
      messages,
      max_tokens,
      temperature,
      top_p,
      return_citations,
      return_images
    };

    if (search_domain_filter && search_domain_filter.length > 0) {
      requestBody.search_domain_filter = search_domain_filter;
    }

    if (search_recency_filter) {
      requestBody.search_recency_filter = search_recency_filter;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Search for evidence related to a claim with automatic citation extraction
   */
  async searchEvidence(
    claim: string,
    topic?: string,
    options: {
      recencyFilter?: "day" | "week" | "month" | "year";
      domainFilter?: string[];
    } = {}
  ): Promise<{
    summary: string;
    citations: string[];
    response: PerplexityResponse;
  }> {
    const systemPrompt = `You are a fact-checking research assistant. Your task is to find reliable evidence about the given claim.

Provide a concise summary of what you found, citing specific sources. Focus on:
- Verifiable facts from reliable sources
- Recent information when relevant
- Multiple perspectives if the claim is debated
- Clear statement if evidence is insufficient or contradictory`;

    const userPrompt = topic
      ? `Topic: ${topic}\n\nClaim to verify: "${claim}"\n\nFind and summarize reliable evidence about this claim.`
      : `Claim to verify: "${claim}"\n\nFind and summarize reliable evidence about this claim.`;

    const response = await this.chat({
      model: "llama-3.1-sonar-large-128k-online",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.2,
      return_citations: true,
      search_recency_filter: options.recencyFilter,
      search_domain_filter: options.domainFilter
    });

    const summary = response.choices[0]?.message?.content || "";
    const citations = response.citations || [];

    return {
      summary,
      citations,
      response
    };
  }

  /**
   * Generate background context about a claim topic
   * Returns 2-4 sentences providing real-world background information
   * that helps readers understand what the claim is talking about
   */
  async generateBackgroundContext(
    claim: string,
    topic: string
  ): Promise<string> {
    const systemPrompt = `You provide brief, factual background information about real-world subjects.

TASK: Write 2-4 sentences explaining relevant background about the entities, events, policies, technologies, or mechanisms mentioned in the claim below. Help someone unfamiliar with the subject understand what it's about.

CRITICAL RULES:
- Explain WHAT things are, not WHETHER the claim is accurate
- Define relevant entities: Who/what is being discussed? What organization, person, policy, technology, or event?
- Include relevant timelines, context, or mechanisms if applicable
- Write in plain language for an intelligent non-expert

ABSOLUTELY FORBIDDEN:
- Starting any sentence with "This claim" or "The claim"
- Using words like "assertion", "statement", "allegation" to refer to the claim
- Evaluating truth, accuracy, or likelihood
- Meta-language about the analysis or verification process
- Generic filler that could apply to any claim
- Phrases like "Understanding this requires..." or "This involves..."

EXAMPLE OUTPUTS (these are GOOD):
- "The World Health Organization (WHO) is a specialized United Nations agency responsible for international public health. It coordinates global health responses and issues guidelines that member nations may adopt or modify."
- "Jake Paul is an American YouTuber and professional boxer who gained fame through social media. Since 2020, he has competed in professional boxing matches, often against opponents from other combat sports."
- "Intermittent fasting is an eating pattern that cycles between periods of fasting and eating. Common protocols include 16:8 (16 hours fasting, 8 hours eating) and 5:2 (normal eating 5 days, reduced calories 2 days)."

If the subject is too obscure or specific to explain, write ONE concrete sentence stating what information is limited: "Limited public information exists about [specific subject]."`;

    const userPrompt = `Topic: ${topic}

Subject to explain: "${claim}"

Provide 2-4 sentences of background context about the subject matter.`;

    try {
      const response = await this.chat({
        model: "llama-3.1-sonar-large-128k-online",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
        return_citations: false,
        search_recency_filter: "month"
      });

      const context = response.choices[0]?.message?.content?.trim() || "";
      return context;
    } catch (error: any) {
      console.error("[perplexity] Background context generation failed:", error.message);
      return "";
    }
  }
}

// Create and export the client instance (only if API key is configured)
export const perplexity = env.PERPLEXITY_API_KEY
  ? new PerplexityClient(env.PERPLEXITY_API_KEY)
  : null;

export { PerplexityClient };

