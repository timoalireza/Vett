export type EvidenceResult = {
  id: string;
  provider: string;
  title: string;
  url: string;
  summary: string;
  reliability: number;
  publishedAt?: string;
  evaluation?: {
    reliability: number;
    relevance: number;
    stance?: "supports" | "refutes" | "mixed" | "unclear" | "irrelevant";
    assessment: string;
  };
};

export type RetrieverOptions = {
  topic: string;
  claimText: string;
  maxResults: number;
  /**
   * Optional overall timeout per retriever call.
   * If unset, the retriever layer will use its default.
   */
  timeoutMs?: number;
};

export interface Retriever {
  name: string;
  isConfigured: () => boolean;
  fetchEvidence: (options: RetrieverOptions) => Promise<EvidenceResult[]>;
}

