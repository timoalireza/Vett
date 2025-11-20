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

export interface AnalysisResponse {
  id: string;
  status: string;
  createdAt: string;
  score: number | null;
  verdict: string | null;
  confidence: number | null;
  bias?: string | null;
  summary?: string | null;
  recommendation?: string | null;
  imageUrl?: string | null;
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
      summary
      recommendation
      imageUrl
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


