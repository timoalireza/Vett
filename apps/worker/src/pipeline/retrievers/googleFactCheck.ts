import { randomUUID } from "node:crypto";

import { env } from "../../env.js";
import type { EvidenceResult, Retriever, RetrieverOptions } from "./types.js";

const GOOGLE_FACT_CHECK_ENDPOINT =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";

async function googleFactCheck(options: RetrieverOptions): Promise<EvidenceResult[]> {
  if (!env.GOOGLE_FACT_CHECK_API_KEY) {
    return [];
  }

  const params = new URLSearchParams({
    key: env.GOOGLE_FACT_CHECK_API_KEY,
    query: options.claimText,
    languageCode: "en",
    pageSize: String(Math.min(options.maxResults, 10))
  });

  try {
    const response = await fetch(`${GOOGLE_FACT_CHECK_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Fact Check API failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      claims?: Array<{
        text?: string;
        claimant?: string;
        claimDate?: string;
        claimReview?: Array<{
          publisher?: { name?: string; site?: string };
          title?: string;
          url?: string;
          textualRating?: string;
        }>;
      }>;
    };

    const claims = data.claims ?? [];

    return claims.flatMap((claim, index) => {
      const reviews = claim.claimReview ?? [];
      return reviews.map((review) => ({
        id: randomUUID(),
        provider: review.publisher?.name ?? "Google Fact Check",
        title: review.title ?? claim.text ?? `Fact check ${index + 1}`,
        url: review.url ?? review.publisher?.site ?? "",
        summary: review.textualRating ?? "No rating provided.",
        reliability: 0.85,
        publishedAt: claim.claimDate
      }));
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Google Fact Check error:", error);
    return [];
  }
}

export const googleFactCheckRetriever: Retriever = {
  name: "google_fact_check",
  isConfigured: () => Boolean(env.GOOGLE_FACT_CHECK_API_KEY),
  fetchEvidence: googleFactCheck
};

