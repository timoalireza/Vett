import { graphqlRequest } from "./graphql";

const VETTAI_CHAT_MUTATION = `
  mutation ChatWithVettAI($input: VettAIChatInput!) {
    chatWithVettAI(input: $input) {
      response
    }
  }
`;

export interface VettAIChatInput {
  message: string;
  analysisId?: string;
  context?: {
    claim?: string;
    verdict?: string;
    score?: number;
    summary?: string;
    sources?: Array<{ title: string; url: string }>;
  };
}

export async function chatWithVettAI(
  message: string,
  analysisId?: string
): Promise<string> {
  const result = await graphqlRequest<{ chatWithVettAI: { response: string } }>(
    VETTAI_CHAT_MUTATION,
    {
      input: {
        message,
        analysisId: analysisId ?? null
      }
    }
  );
  return result.chatWithVettAI.response;
}

