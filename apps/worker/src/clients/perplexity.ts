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
}

// Create and export the client instance (only if API key is configured)
export const perplexity = env.PERPLEXITY_API_KEY
  ? new PerplexityClient(env.PERPLEXITY_API_KEY)
  : null;

export { PerplexityClient };

