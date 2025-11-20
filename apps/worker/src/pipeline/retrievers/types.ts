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
    assessment: string;
  };
};

export type RetrieverOptions = {
  topic: string;
  claimText: string;
  maxResults: number;
};

export interface Retriever {
  name: string;
  isConfigured: () => boolean;
  fetchEvidence: (options: RetrieverOptions) => Promise<EvidenceResult[]>;
}

