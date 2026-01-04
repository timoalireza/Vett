import { perplexity } from "../../clients/perplexity.js";
import type { Retriever, RetrieverOptions, EvidenceResult } from "./types.js";

const TRUSTED_DOMAINS = [
  "who.int",
  "cdc.gov",
  "nih.gov",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "nature.com",
  "science.org",
  "snopes.com",
  "factcheck.org",
  "politifact.com"
];

async function perplexitySearch(options: RetrieverOptions): Promise<EvidenceResult[]> {
  if (!perplexity) {
    console.warn("[perplexity] API key not configured, skipping");
    return [];
  }

  try {
    // Determine recency filter based on topic
    let recencyFilter: "day" | "week" | "month" | "year" | undefined;
    const topic = options.topic.toLowerCase();
    
    if (topic.includes("politics") || topic.includes("current events") || topic.includes("news")) {
      recencyFilter = "week";
    } else if (topic.includes("health") || topic.includes("science") || topic.includes("technology")) {
      recencyFilter = "month";
    } else {
      recencyFilter = "year";
    }

    console.log(`[perplexity] Searching for claim: "${options.claimText.slice(0, 60)}..." (recency: ${recencyFilter})`);

    const result = await perplexity.searchEvidence(options.claimText, options.topic, {
      recencyFilter
    });

    const { summary, citations } = result;

    if (!citations || citations.length === 0) {
      console.warn("[perplexity] No citations returned");
      return [];
    }

    // Parse citations and create evidence results
    const evidenceResults: EvidenceResult[] = [];
    const sentences = summary.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    
    for (let i = 0; i < Math.min(citations.length, options.maxResults); i++) {
      const url = citations[i];
      
      if (!url || !url.startsWith("http")) {
        continue;
      }

      // Extract domain for reliability scoring
      // Wrap URL parsing in try-catch to skip malformed URLs without failing entire retrieval
      let hostname: string;
      try {
        hostname = new URL(url).hostname.toLowerCase();
      } catch (error) {
        console.warn(`[perplexity] Skipping malformed URL at index ${i}: ${url}`);
        continue;
      }

      const isTrustedDomain = TRUSTED_DOMAINS.some((domain) => hostname.includes(domain));
      
      // Base reliability on domain trust
      let reliability = 0.7; // Default reliability
      if (isTrustedDomain) {
        reliability = 0.9;
      } else if (hostname.includes(".gov") || hostname.includes(".edu")) {
        reliability = 0.85;
      }

      // Extract a snippet from the summary that references this source
      // Perplexity uses 1-based indexing where citations[i] corresponds to marker [i+1]
      const citationMarker = `[${i + 1}]`;
      let snippet = "";
      
      for (const sentence of sentences) {
        if (sentence.includes(citationMarker)) {
          snippet = sentence.replace(/\[\d+\]/g, "").trim();
          break;
        }
      }
      
      // If no specific snippet found, use a generic portion of the summary
      if (!snippet && summary) {
        snippet = sentences[0] || summary.slice(0, 200);
      }

      evidenceResults.push({
        id: `perplexity-${Date.now()}-${evidenceResults.length}`,
        provider: "Perplexity",
        title: hostname, // Perplexity doesn't return titles, use hostname
        url,
        summary: snippet || summary.slice(0, 300),
        reliability
      });
    }

    console.log(`[perplexity] Found ${evidenceResults.length} evidence results`);
    return evidenceResults;
  } catch (error: any) {
    console.error("[perplexity] Search failed:", error.message);
    return [];
  }
}

export const perplexityRetriever: Retriever = {
  name: "Perplexity",
  isConfigured: () => perplexity !== null,
  fetchEvidence: perplexitySearch
};

