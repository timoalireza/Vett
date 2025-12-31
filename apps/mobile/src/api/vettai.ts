import { graphqlRequest } from "./graphql";

const VETTAI_CHAT_MUTATION = `
  mutation ChatWithVettAI($input: VettAIChatInput!) {
    chatWithVettAI(input: $input) {
      response
      chatUsage {
        dailyCount
        maxDaily
        remaining
      }
    }
  }
`;

const CHAT_USAGE_QUERY = `
  query ChatUsage {
    chatUsage {
      dailyCount
      maxDaily
      remaining
    }
  }
`;

export interface VettAIChatInput {
  message: string;
  analysisId?: string;
}

export interface ChatUsageInfo {
  dailyCount: number;
  maxDaily: number | null;
  remaining: number | null;
}

export interface VettAIChatResponse {
  response: string;
  chatUsage: ChatUsageInfo;
}

export async function chatWithVettAI(
  message: string,
  analysisId?: string
): Promise<VettAIChatResponse> {
  const result = await graphqlRequest<{ chatWithVettAI: VettAIChatResponse }>(
    VETTAI_CHAT_MUTATION,
    {
      input: {
        message,
        analysisId: analysisId ?? null
      }
    }
  );
  return result.chatWithVettAI;
}

export async function getChatUsage(): Promise<ChatUsageInfo> {
  const result = await graphqlRequest<{ chatUsage: ChatUsageInfo }>(
    CHAT_USAGE_QUERY
  );
  return result.chatUsage;
}

