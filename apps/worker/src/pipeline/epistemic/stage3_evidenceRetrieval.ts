/**
 * Stage 3: Evidence Retrieval
 * 
 * Wraps existing evidence retrievers and builds an evidence graph.
 * Tags each source by type and detects single-source dominance.
 */

import { randomUUID } from "node:crypto";
import { openai } from "../../clients/openai.js";
import { parseJsonContent } from "../utils/openai.js";
import { retrieveEvidence } from "../retrievers/index.js";
import { evaluateEvidenceForClaim } from "../evidence/evaluator.js";
import { extractHostname, HOST_TRUST } from "../retrievers/trust.js";
import type { EvidenceResult } from "../retrievers/types.js";
import {
  TypedClaim,
  EvidenceNode,
  EvidenceGraph,
  EvidenceGraphStats,
  EvidenceRetrievalArtifact,
  EvidenceSourceType,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";

const MODEL_NAME = "gpt-4.1-mini";
const SOURCE_TYPING_TIMEOUT_MS = Number(process.env.EPISTEMIC_SOURCE_TYPING_TIMEOUT_MS ?? 6_000);
const EVIDENCE_CONCURRENCY = Number(process.env.EPISTEMIC_EVIDENCE_CONCURRENCY ?? 2);

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function asyncPool<T, R>(
  poolLimit: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Number.isFinite(poolLimit) && poolLimit > 0 ? Math.floor(poolLimit) : 1;
  const ret: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();

  const enqueue = async (item: T, index: number) => {
    const p = (async () => {
      ret[index] = await iteratorFn(item, index);
    })();
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  };

  for (let i = 0; i < items.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await enqueue(items[i]!, i);
  }

  await Promise.all(executing);
  return ret;
}

// Institutional/high-trust domains that are considered authoritative
const INSTITUTIONAL_DOMAINS = new Set([
  "who.int",
  "cdc.gov",
  "nih.gov",
  "fda.gov",
  "epa.gov",
  "nasa.gov",
  "noaa.gov",
  "un.org",
  "worldbank.org",
  "imf.org",
  "oecd.org",
  "nature.com",
  "science.org",
  "thelancet.com",
  "nejm.org",
  "bmj.com",
  "pubmed.ncbi.nlm.nih.gov"
]);

// Peer-reviewed indicators in URLs or providers
const PEER_REVIEWED_PATTERNS = [
  /pubmed/i,
  /doi\.org/i,
  /ncbi\.nlm\.nih/i,
  /nature\.com/i,
  /science\.org/i,
  /sciencedirect/i,
  /springer/i,
  /wiley/i,
  /oxford.*journal/i,
  /cambridge.*journal/i,
  /plos/i,
  /journal/i,
  /\.edu\/.*research/i
];

// Model-based/projection indicators
const MODEL_BASED_PATTERNS = [
  /projection/i,
  /forecast/i,
  /model/i,
  /simulation/i,
  /scenario/i,
  /predict/i,
  /estimate/i,
  /by \d{4}/i
];

const SOURCE_TYPING_PROMPT = `You are classifying evidence sources for fact-checking. For each source, determine its type:

1. **empirical**: Direct observations, measurements, surveys, experiments with actual data
2. **model_based**: Projections, forecasts, simulations, scenario analysis
3. **meta_analysis**: Systematic reviews, meta-analyses combining multiple studies
4. **institutional_consensus**: Official statements from recognized institutions (WHO, CDC, UN, etc.)
5. **news_report**: Journalism reporting on events or findings
6. **opinion**: Op-eds, editorials, commentary pieces
7. **unknown**: Cannot determine

Also determine:
- Is this peer-reviewed? (published in academic/scientific journal with peer review)
- Is this from an institutional/government source?

Respond in JSON only.`;

const SOURCE_TYPING_SCHEMA = {
  type: "object",
  properties: {
    source_types: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_id: { type: "string" },
          source_type: {
            type: "string",
            enum: ["empirical", "model_based", "meta_analysis", "institutional_consensus", "news_report", "opinion", "unknown"]
          },
          is_peer_reviewed: { type: "boolean" },
          is_institutional: { type: "boolean" }
        },
        required: ["source_id", "source_type", "is_peer_reviewed", "is_institutional"],
        additionalProperties: false
      }
    }
  },
  required: ["source_types"],
  additionalProperties: false
} as const;

export interface EvidenceRetrievalInput {
  typedClaims: TypedClaim[];
  topic: string;
  maxResultsPerClaim?: number;
  retrieverTimeoutMs?: number;
}

export interface EvidenceRetrievalOutput {
  artifact: EvidenceRetrievalArtifact;
  durationMs: number;
}

async function classifySourceTypes(
  sources: Array<{ id: string; url: string; title: string; summary: string; provider: string }>
): Promise<Map<string, { sourceType: EvidenceSourceType; isPeerReviewed: boolean; isInstitutional: boolean }>> {
  const result = new Map<string, { sourceType: EvidenceSourceType; isPeerReviewed: boolean; isInstitutional: boolean }>();

  if (sources.length === 0) return result;

  // First, apply heuristic pre-classification
  for (const source of sources) {
    const hostname = extractHostname(source.url);
    let sourceType: EvidenceSourceType = "unknown";
    let isPeerReviewed = false;
    let isInstitutional = false;

    if (hostname) {
      // Check institutional
      isInstitutional = INSTITUTIONAL_DOMAINS.has(hostname) || 
        hostname.endsWith(".gov") || 
        hostname.endsWith(".int") ||
        HOST_TRUST.has(hostname);

      // Check peer-reviewed
      isPeerReviewed = PEER_REVIEWED_PATTERNS.some((p) => p.test(source.url) || p.test(source.provider));

      // Infer type from patterns
      if (isInstitutional) {
        sourceType = "institutional_consensus";
      } else if (isPeerReviewed) {
        sourceType = "empirical"; // Most peer-reviewed are empirical
      } else if (MODEL_BASED_PATTERNS.some((p) => p.test(source.title) || p.test(source.summary))) {
        sourceType = "model_based";
      } else if (/news|times|post|herald|tribune|cnn|bbc|reuters|ap\s|associated\s+press/i.test(source.provider)) {
        sourceType = "news_report";
      }
    }

    result.set(source.id, { sourceType, isPeerReviewed, isInstitutional });
  }

  // Try LLM classification for better accuracy on ambiguous sources
  const ambiguousSources = sources.filter((s) => result.get(s.id)?.sourceType === "unknown");

  if (ambiguousSources.length > 0) {
    try {
      const sourcesInput = ambiguousSources
        .map((s) => `ID: ${s.id}\nURL: ${s.url}\nTitle: ${s.title}\nProvider: ${s.provider}\nSummary: ${s.summary.slice(0, 200)}`)
        .join("\n\n---\n\n");

      const response = await withTimeout(
        openai.responses.create({
          model: MODEL_NAME,
          input: [
            { role: "system", content: SOURCE_TYPING_PROMPT },
            { role: "user", content: sourcesInput }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "source_typing",
              schema: SOURCE_TYPING_SCHEMA,
              strict: true
            }
          }
        }),
        SOURCE_TYPING_TIMEOUT_MS,
        "Epistemic source typing"
      );

      const firstOutput = response.output?.[0] as any;
      const firstContent = firstOutput?.content?.[0];

      if (firstOutput && firstContent) {
        const parsed = await parseJsonContent<{
          source_types: Array<{
            source_id: string;
            source_type: EvidenceSourceType;
            is_peer_reviewed: boolean;
            is_institutional: boolean;
          }>;
        }>(firstContent, "source_typing");

        if (parsed?.source_types) {
          for (const st of parsed.source_types) {
            result.set(st.source_id, {
              sourceType: st.source_type,
              isPeerReviewed: st.is_peer_reviewed,
              isInstitutional: st.is_institutional
            });
          }
        }
      }
    } catch (error) {
      console.warn("[Stage3_EvidenceRetrieval] LLM source typing failed, using heuristics:", error);
    }
  }

  return result;
}

function computeGraphStats(nodes: EvidenceNode[]): EvidenceGraphStats {
  const hostnameDistribution: Record<string, number> = {};
  const sourceTypeDistribution: Record<EvidenceSourceType, number> = {
    empirical: 0,
    model_based: 0,
    meta_analysis: 0,
    institutional_consensus: 0,
    news_report: 0,
    opinion: 0,
    unknown: 0
  };

  let totalReliability = 0;
  let peerReviewedCount = 0;
  let modelBasedCount = 0;
  let supportingCount = 0;
  let refutingCount = 0;
  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;

  for (const node of nodes) {
    // Hostname distribution
    hostnameDistribution[node.hostname] = (hostnameDistribution[node.hostname] || 0) + 1;

    // Source type distribution
    sourceTypeDistribution[node.sourceType]++;

    // Reliability
    totalReliability += node.reliability;

    // Peer reviewed
    if (node.isPeerReviewed) peerReviewedCount++;

    // Model based
    if (node.sourceType === "model_based") modelBasedCount++;

    // Stance
    if (node.stance === "supports") supportingCount++;
    if (node.stance === "refutes") refutingCount++;

    // Dates
    if (node.publishedAt) {
      const date = new Date(node.publishedAt);
      if (!isNaN(date.getTime())) {
        if (!oldestDate || date < oldestDate) oldestDate = date;
        if (!newestDate || date > newestDate) newestDate = date;
      }
    }
  }

  const uniqueHostnames = Object.keys(hostnameDistribution).length;
  const totalSources = nodes.length;

  // Check for single-source dominance (>50% from one hostname)
  let singleSourceDominance = false;
  let dominantHostname: string | undefined;

  for (const [hostname, count] of Object.entries(hostnameDistribution)) {
    if (totalSources > 0 && count / totalSources > 0.5) {
      singleSourceDominance = true;
      dominantHostname = hostname;
      break;
    }
  }

  return {
    totalSources,
    uniqueHostnames,
    hostnameDistribution,
    singleSourceDominance,
    dominantHostname,
    sourceTypeDistribution,
    averageReliability: totalSources > 0 ? totalReliability / totalSources : 0,
    peerReviewedCount,
    modelBasedCount,
    supportingCount,
    refutingCount,
    oldestEvidenceDate: oldestDate?.toISOString(),
    newestEvidenceDate: newestDate?.toISOString()
  };
}

export async function retrieveEvidenceForEpistemic(
  input: EvidenceRetrievalInput
): Promise<EvidenceRetrievalOutput> {
  const startTime = Date.now();
  const maxResults = input.maxResultsPerClaim ?? 5;

  if (input.typedClaims.length === 0) {
    const emptyGraph: EvidenceGraph = {
      nodes: [],
      stats: computeGraphStats([]),
      retrievalTimestamp: new Date().toISOString()
    };

    return {
      artifact: {
        version: EPISTEMIC_PIPELINE_VERSION,
        timestamp: new Date().toISOString(),
        contentHash: computeContentHash(emptyGraph),
        evidenceGraph: emptyGraph
      },
      durationMs: Date.now() - startTime
    };
  }

  // Retrieve + evaluate evidence for each claim with a concurrency limit to avoid rate limiting / tail latency.
  const evidenceByClaim = await asyncPool(EVIDENCE_CONCURRENCY, input.typedClaims, async (claim) => {
    const rawEvidence = await retrieveEvidence({
      topic: input.topic,
      claimText: claim.originalText,
      maxResults,
      timeoutMs: input.retrieverTimeoutMs
    });

    const evaluated = await evaluateEvidenceForClaim(claim.originalText, rawEvidence);

    return {
      claimId: claim.id,
      evidence: evaluated
    };
  });

  // Deduplicate by URL across all claims
  const seenUrls = new Set<string>();
  const allEvidence: Array<EvidenceResult & { claimIds: string[] }> = [];

  for (const { claimId, evidence } of evidenceByClaim) {
    for (const ev of evidence) {
      if (seenUrls.has(ev.url)) {
        // Add claim ID to existing evidence
        const existing = allEvidence.find((e) => e.url === ev.url);
        if (existing && !existing.claimIds.includes(claimId)) {
          existing.claimIds.push(claimId);
        }
      } else {
        seenUrls.add(ev.url);
        allEvidence.push({ ...ev, claimIds: [claimId] });
      }
    }
  }

  // Create preliminary evidence nodes
  const preliminaryNodes = allEvidence.map((ev) => ({
    id: randomUUID(),
    url: ev.url,
    title: ev.title,
    summary: ev.summary,
    provider: ev.provider,
    claimIds: ev.claimIds,
    reliability: ev.evaluation?.reliability ?? ev.reliability,
    relevance: ev.evaluation?.relevance ?? 0.5,
    stance: ev.evaluation?.stance ?? "unclear",
    publishedAt: ev.publishedAt
  }));

  // Classify source types
  const sourceTypes = await classifySourceTypes(
    preliminaryNodes.map((n) => ({
      id: n.id,
      url: n.url,
      title: n.title,
      summary: n.summary,
      provider: n.provider
    }))
  );

  // Build final evidence nodes
  const evidenceNodes: EvidenceNode[] = preliminaryNodes.map((node) => {
    const typeInfo = sourceTypes.get(node.id) ?? {
      sourceType: "unknown" as const,
      isPeerReviewed: false,
      isInstitutional: false
    };

    return {
      id: node.id,
      url: node.url,
      hostname: extractHostname(node.url) ?? "unknown",
      provider: node.provider,
      title: node.title,
      summary: node.summary,
      publishedAt: node.publishedAt,
      sourceType: typeInfo.sourceType,
      isPeerReviewed: typeInfo.isPeerReviewed,
      isInstitutional: typeInfo.isInstitutional,
      reliability: node.reliability,
      relevance: node.relevance,
      stance: node.stance as "supports" | "refutes" | "mixed" | "unclear" | "irrelevant",
      claimIds: node.claimIds
    };
  });

  const evidenceGraph: EvidenceGraph = {
    nodes: evidenceNodes,
    stats: computeGraphStats(evidenceNodes),
    retrievalTimestamp: new Date().toISOString()
  };

  const artifact: EvidenceRetrievalArtifact = {
    version: EPISTEMIC_PIPELINE_VERSION,
    timestamp: new Date().toISOString(),
    contentHash: computeContentHash(evidenceGraph),
    evidenceGraph
  };

  return {
    artifact,
    durationMs: Date.now() - startTime
  };
}

