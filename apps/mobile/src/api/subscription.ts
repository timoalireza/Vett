import { graphqlRequest } from "./graphql";

export interface SubscriptionInfo {
  plan: "FREE" | "PLUS" | "PRO";
  status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING";
  billingCycle: "MONTHLY" | "ANNUAL";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  limits: {
    maxAnalysesPerMonth: number | null;
    hasWatermark: boolean;
    historyRetentionDays: number | null;
    hasPriorityProcessing: boolean;
    hasAdvancedBiasAnalysis: boolean;
    hasExtendedSummaries: boolean;
    hasCrossPlatformSync: boolean;
    hasCustomAlerts: boolean;
    maxSources: number;
  };
  prices: {
    monthly: number;
    annual: number;
  };
  usage: {
    analysesCount: number;
    maxAnalyses: number | null;
    periodStart: string;
    periodEnd: string;
    hasUnlimited: boolean;
  };
}

const SUBSCRIPTION_QUERY = `
  query Subscription {
    subscription {
      plan
      status
      billingCycle
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
      limits {
        maxAnalysesPerMonth
        hasWatermark
        historyRetentionDays
        hasPriorityProcessing
        hasAdvancedBiasAnalysis
        hasExtendedSummaries
        hasCrossPlatformSync
        hasCustomAlerts
        maxSources
      }
      prices {
        monthly
        annual
      }
      usage {
        analysesCount
        maxAnalyses
        periodStart
        periodEnd
        hasUnlimited
      }
    }
  }
`;

export async function fetchSubscription(): Promise<SubscriptionInfo> {
  const result = await graphqlRequest<{ subscription: SubscriptionInfo }>(SUBSCRIPTION_QUERY);
  return result.subscription;
}

