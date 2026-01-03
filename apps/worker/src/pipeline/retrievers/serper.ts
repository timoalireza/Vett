import { randomUUID } from "node:crypto";

import { env } from "../../env.js";
import type { EvidenceResult, Retriever, RetrieverOptions } from "./types.js";

const SERPER_ENDPOINT = "https://google.serper.dev/search";

async function serperSearch(options: RetrieverOptions): Promise<EvidenceResult[]> {
  if (!env.SERPER_API_KEY) {
    return [];
  }

  const body = {
    q: `${options.claimText}`,
    num: options.maxResults
  };

  try {
    const response = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": env.SERPER_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper search failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
    };

    const results = data.organic ?? [];

    return results.slice(0, options.maxResults).map((result, index) => ({
      id: randomUUID(),
      provider: "Serper",
      title: result.title ?? `Serper result ${index + 1}`,
      url: result.link ?? "",
      summary: result.snippet ?? "No summary available.",
      reliability: 0.65,
      publishedAt: result.date
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Serper search error:", error);
    return [];
  }
}

export const serperRetriever: Retriever = {
  name: "serper",
  isConfigured: () => Boolean(env.SERPER_API_KEY),
  fetchEvidence: serperSearch
};

