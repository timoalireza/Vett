import type { EvidenceResult, RetrieverOptions } from "./types.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = {
  expiresAt: number;
  results: EvidenceResult[];
};

const cache = new Map<string, CacheEntry>();

function buildKey(options: RetrieverOptions): string {
  return JSON.stringify({
    topic: options.topic.toLowerCase(),
    claim: options.claimText.trim().toLowerCase(),
    maxResults: options.maxResults
  });
}

export function getCachedEvidence(options: RetrieverOptions): EvidenceResult[] | null {
  const key = buildKey(options);
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.results.map((result) => ({ ...result }));
}

export function setCachedEvidence(options: RetrieverOptions, results: EvidenceResult[]): void {
  const key = buildKey(options);
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results: results.map((result) => ({ ...result }))
  });
}

export function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}


