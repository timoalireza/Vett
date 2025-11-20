import { braveRetriever } from "./brave.js";
import { serperRetriever } from "./serper.js";
import { googleFactCheckRetriever } from "./googleFactCheck.js";
import type { EvidenceResult, Retriever, RetrieverOptions } from "./types.js";
import { getCachedEvidence, setCachedEvidence, pruneCache } from "./cache.js";
import { adjustReliability, extractHostname, isBlacklisted, isLowTrust } from "./trust.js";

const RETRIEVERS: Retriever[] = [braveRetriever, serperRetriever, googleFactCheckRetriever];

async function runWithRetry(
  retriever: Retriever,
  options: RetrieverOptions,
  attempts = 2
): Promise<EvidenceResult[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const results = await retriever.fetchEvidence(options);
      if (attempt > 1) {
        console.info(`[retrievers] ${retriever.name} succeeded on retry ${attempt}.`);
      }
      return results;
    } catch (error) {
      lastError = error;
      // eslint-disable-next-line no-console
      console.error(
        `[retrievers] ${retriever.name} attempt ${attempt} failed:`,
        error instanceof Error ? error.message : error
      );
      if (attempt < attempts) {
        const backoff = 250 * attempt;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  if (lastError) {
    // eslint-disable-next-line no-console
    console.error(`[retrievers] ${retriever.name} exhausted retries.`, lastError);
  }
  return [];
}

export async function retrieveEvidence(options: RetrieverOptions): Promise<EvidenceResult[]> {
  const activeRetrievers = RETRIEVERS.filter((retriever) => retriever.isConfigured());

  if (activeRetrievers.length === 0) {
    console.info(
      "[retrievers] No retrievers configured. Provide API keys for Brave, Serper, or Google Fact Check."
    );
    return [];
  }

  pruneCache();

  const cached = getCachedEvidence(options);
  if (cached) {
    console.info(
      `[retrievers] Cache hit for claim="${options.claimText.slice(0, 60)}..." (results=${cached.length}).`
    );
    return cached;
  }

  console.info(
    `[retrievers] Running evidence search for topic="${options.topic}" claim="${options.claimText.slice(
      0,
      60
    )}..." using [${activeRetrievers.map((r) => r.name).join(", ")}]`
  );

  const results = await Promise.all(activeRetrievers.map((retriever) => runWithRetry(retriever, options)));

  const flattened = results.flat();

  console.info(
    `[retrievers] Evidence results counts: ${activeRetrievers
      .map((retriever, index) => `${retriever.name}=${results[index]?.length ?? 0}`)
      .join(", ")}`
  );

  // Deduplicate by URL.
  const seen = new Set<string>();
  const deduped = flattened.filter((item) => {
    if (!item.url) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  const stats = {
    total: deduped.length,
    droppedMissingHost: 0,
    droppedBlacklist: 0,
    droppedLowTrust: 0
  };

  const sanitized: EvidenceResult[] = [];

  for (const item of deduped) {
    const hostname = extractHostname(item.url);
    if (!hostname) {
      stats.droppedMissingHost += 1;
      continue;
    }

    if (isBlacklisted(item.url)) {
      stats.droppedBlacklist += 1;
      continue;
    }

    const adjustedReliability = adjustReliability(item.url, item.reliability);
    if (isLowTrust(item.url, adjustedReliability)) {
      stats.droppedLowTrust += 1;
      continue;
    }

    sanitized.push({
      ...item,
      reliability: adjustedReliability
    });
  }

  const groupedByHost = new Map<string, EvidenceResult[]>();
  for (const item of sanitized) {
    const hostname = extractHostname(item.url);
    if (!hostname) continue;

    if (!groupedByHost.has(hostname)) {
      groupedByHost.set(hostname, []);
    }
    groupedByHost.get(hostname)!.push(item);
  }

  const MAX_PER_HOST = 2;
  const cleaned: EvidenceResult[] = [];

  for (const [, items] of groupedByHost) {
    items.sort((a, b) => (b.reliability ?? 0.6) - (a.reliability ?? 0.6));
    cleaned.push(...items.slice(0, MAX_PER_HOST));
  }

  console.info(
    `[retrievers] Evidence filtering: kept=${cleaned.length}/${
      stats.total
    } (missingHost=${stats.droppedMissingHost}, blacklist=${stats.droppedBlacklist}, lowTrust=${stats.droppedLowTrust})`
  );

  setCachedEvidence(options, cleaned);

  return cleaned;
}


