import { AnalysisAttachmentInput, AnalysisJobInput } from "@vett/shared";

export type PipelineSource = {
  key: string;
  provider: string;
  title: string;
  url: string;
  reliability: number;
  summary?: string;
  evaluation?: {
    reliability: number;
    relevance: number;
    assessment: string;
  };
};

export type PipelineClaim = {
  id: string;
  text: string;
  extractionConfidence: number;
  verdict: "Verified" | "Mostly Accurate" | "Partially Accurate" | "False" | "Opinion" | "Unverified";
  confidence: number;
  sourceKeys: string[];
};

export type PipelineExplanationStep = {
  id: string;
  description: string;
  sourceKeys: string[];
  confidence: number;
};

export type ClassificationMetadata = {
  model: string;
  confidence: number;
  rationale: string;
  fallbackUsed: boolean;
};

export type ClaimExtractionMetadata = {
  model: string;
  usedFallback: boolean;
  totalClaims: number;
  warnings?: string[];
};

export type ReasonerMetadata = {
  model: string;
  confidence: number;
  fallbackUsed: boolean;
  rationale?: string;
};

export type IngestionRecord = {
  attachment: AnalysisAttachmentInput;
  text?: string;
  wordCount?: number;
  truncated: boolean;
  error?: string;
  quality?: {
    level: "excellent" | "good" | "fair" | "poor" | "insufficient";
    score: number;
    reasons?: string[];
    recommendation?: "screenshot" | "api_key" | "none";
    message?: string;
  };
};

export type IngestionMetadata = {
  totalAttachments: number;
  processedLinks: number;
  processedImages: number;
  processedDocuments: number;
  successful: number;
  failed: number;
  totalCharacters: number;
  warnings?: string[];
};

export type PipelineMetadata = {
  classification: ClassificationMetadata;
  claimExtraction: ClaimExtractionMetadata;
  reasoner?: ReasonerMetadata;
  ingestion?: IngestionMetadata;
};

export type PipelineResult = {
  topic: string;
  bias: "Left" | "Center-left" | "Center" | "Center-right" | "Right" | null;
  score: number | null; // null for "Unverified" verdicts
  verdict: "Verified" | "Mostly Accurate" | "Partially Accurate" | "False" | "Opinion" | "Unverified";
  confidence: number;
  title: string; // 3-10 word summary title for history display
  summary: string;
  recommendation: string;
  complexity: "simple" | "medium" | "complex"; // Analysis complexity level
  sources: PipelineSource[];
  claims: PipelineClaim[];
  explanationSteps: PipelineExplanationStep[];
  metadata: PipelineMetadata;
  ingestionRecords?: IngestionRecord[];
  resultJson: Record<string, unknown>;
};

export type PipelineContext = {
  analysisId: string;
  input: AnalysisJobInput;
  normalizedText: string;
  attachments: AnalysisAttachmentInput[];
};



