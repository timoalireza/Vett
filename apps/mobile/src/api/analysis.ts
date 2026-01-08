import { graphqlRequest } from "./graphql";

export interface SubmitAnalysisInput {
  text?: string | null;
  contentUri?: string | null;
  mediaType: string;
  topicHint?: string | null;
  attachments?: Array<{
    kind: "LINK" | "IMAGE" | "DOCUMENT";
    url: string;
    mediaType?: string | null;
    title?: string | null;
    summary?: string | null;
    altText?: string | null;
    caption?: string | null;
  }>;
}

// Epistemic Pipeline Types (Graded Evaluator)
export interface EpistemicPenalty {
  name: string;
  weight: number;
  rationale: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface EpistemicConfidenceInterval {
  low: number;
  high: number;
}

export interface EpistemicResult {
  version: string;
  finalScore: number;
  scoreBand: string;
  scoreBandDescription: string;
  penaltiesApplied: EpistemicPenalty[];
  evidenceSummary: string;
  confidenceInterval?: EpistemicConfidenceInterval | null;
  explanationText: string;
  keyReasons: string[];
  pipelineVersion: string;
  processedAt: string;
  totalProcessingTimeMs: number;
}

export interface AnalysisResponse {
  id: string;
  status: string;
  createdAt: string;
  score: number | null;
  verdict: string | null;
  confidence: number | null;
  bias?: string | null;
  title?: string | null; // Short title for display (max ~40 chars)
  summary?: string | null;
  recommendation?: string | null;
  backgroundContext?: string | null; // Background information about the claim topic
  rawInput?: string | null;
  claims: Array<{
    id: string;
    text: string;
    verdict: string | null;
    confidence: number | null;
    extractionConfidence: number | null;
  }>;
  sources: Array<{
    id: string;
    provider: string;
    title: string;
    url: string;
    reliability: number | null;
    summary?: string | null;
  }>;
  epistemic?: EpistemicResult | null;
}

const SUBMIT_ANALYSIS_MUTATION = `
  mutation SubmitAnalysis($input: SubmitAnalysisInput!) {
    submitAnalysis(input: $input) {
      analysisId
      status
    }
  }
`;

const ANALYSIS_QUERY = `
  query Analysis($id: ID!) {
    analysis(id: $id) {
      id
      status
      createdAt
      score
      verdict
      confidence
      bias
      title
      summary
      recommendation
      backgroundContext
      claims {
        id
        text
        verdict
        confidence
        extractionConfidence
      }
      sources {
        id
        provider
        title
        url
        reliability
        summary
      }
      epistemic {
        version
        finalScore
        scoreBand
        scoreBandDescription
        penaltiesApplied {
          name
          weight
          rationale
          severity
        }
        evidenceSummary
        confidenceInterval {
          low
          high
        }
        explanationText
        keyReasons
        pipelineVersion
        processedAt
        totalProcessingTimeMs
      }
    }
  }
`;

export async function submitAnalysis(input: SubmitAnalysisInput): Promise<{ analysisId: string }> {
  const result = await graphqlRequest<{ submitAnalysis: { analysisId: string } }>(
    SUBMIT_ANALYSIS_MUTATION,
    { input }
  );
  return { analysisId: result.submitAnalysis.analysisId };
}

export async function fetchAnalysis(id: string): Promise<AnalysisResponse | null> {
  const result = await graphqlRequest<{ analysis: AnalysisResponse | null }>(ANALYSIS_QUERY, { id });
  return result.analysis;
}

export interface AnalysisSummary {
  id: string;
  score: number | null;
  verdict: string | null;
  confidence: number | null;
  bias?: string | null;
  topic?: string | null;
  status: string;
  createdAt: string;
  title?: string | null;
  summary?: string | null;
  recommendation?: string | null;
  complexity?: string | null;
  claims?: Array<{ text: string }>;
  epistemic?: EpistemicResult | null;
}

export interface AnalysesConnection {
  edges: Array<{
    node: AnalysisSummary;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount?: number | null;
}

const ANALYSES_QUERY = `
  query Analyses($first: Int, $after: String) {
    analyses(first: $first, after: $after) {
      edges {
        node {
          id
          score
          verdict
          confidence
          bias
          topic
          status
          createdAt
          title
          summary
          recommendation
          complexity
          claims {
            text
          }
          epistemic {
            finalScore
            scoreBand
            scoreBandDescription
            penaltiesApplied {
              name
              weight
              rationale
              severity
            }
            evidenceSummary
            explanationText
            keyReasons
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export async function fetchAnalyses(first: number = 10, after?: string): Promise<AnalysesConnection> {
  const result = await graphqlRequest<{ analyses: AnalysesConnection }>(ANALYSES_QUERY, { first, after });
  return result.analyses;
}

export interface FeedbackResponse {
  id: string;
  analysisId: string;
  userId: string | null;
  isAgree: boolean;
  comment: string | null;
  createdAt: string;
}

const SUBMIT_FEEDBACK_MUTATION = `
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      feedback {
        id
        analysisId
        userId
        isAgree
        comment
        createdAt
      }
    }
  }
`;

const FEEDBACK_QUERY = `
  query Feedback($analysisId: ID!) {
    feedback(analysisId: $analysisId) {
      id
      analysisId
      userId
      isAgree
      comment
      createdAt
    }
  }
`;

export async function submitFeedback(
  analysisId: string,
  isAgree: boolean,
  comment?: string | null
): Promise<FeedbackResponse> {
  const result = await graphqlRequest<{ submitFeedback: { feedback: FeedbackResponse } }>(
    SUBMIT_FEEDBACK_MUTATION,
    {
      input: {
        analysisId,
        isAgree,
        comment: comment ?? null
      }
    }
  );
  return result.submitFeedback.feedback;
}

export async function fetchFeedback(analysisId: string): Promise<FeedbackResponse | null> {
  const result = await graphqlRequest<{ feedback: FeedbackResponse | null }>(FEEDBACK_QUERY, {
    analysisId
  });
  return result.feedback;
}

const DELETE_ANALYSIS_MUTATION = `
  mutation DeleteAnalysis($id: ID!) {
    deleteAnalysis(id: $id) {
      success
    }
  }
`;

export async function deleteAnalysis(id: string): Promise<boolean> {
  const result = await graphqlRequest<{ deleteAnalysis: { success: boolean } }>(
    DELETE_ANALYSIS_MUTATION,
    { id }
  );
  return result.deleteAnalysis.success;
}

