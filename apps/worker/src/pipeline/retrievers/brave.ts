import { randomUUID } from "node:crypto";

import { env } from "../../env.js";
import type { EvidenceResult, Retriever, RetrieverOptions } from "./types.js";

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

async function braveSearch(options: RetrieverOptions): Promise<EvidenceResult[]> {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return [];
  }

  // NOTE: Avoid overly-restrictive filters like `site:news` (can drop legitimate results).
  // Bias toward timely reporting while still allowing broad coverage.
  const query = `${options.claimText} news -site:pinterest -site:facebook`;

  try {
    const response = await fetch(`${BRAVE_ENDPOINT}?q=${encodeURIComponent(query)}&count=${options.maxResults}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave search failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          age?: string;
          page_age?: string;
          published?: string;
          metaUrl?: { favicon?: string };
        }>;
      };
    };

    const results = data.web?.results ?? [];

    return results.slice(0, options.maxResults).map((result, index) => ({
      id: randomUUID(),
      provider: "Brave Search",
      title: result.title ?? `Evidence ${index + 1}`,
      url: result.url ?? "",
      summary: result.description ?? "No summary available.",
      reliability: 0.7,
      publishedAt: result.published ?? result.page_age ?? result.age
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Brave search error:", error);
    return [];
  }
}

export const braveRetriever: Retriever = {
  name: "brave",
  isConfigured: () => Boolean(env.BRAVE_SEARCH_API_KEY),
  fetchEvidence: braveSearch
};

