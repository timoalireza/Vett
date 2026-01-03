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

const SYNC_SUBSCRIPTION_MUTATION = `
  mutation SyncSubscription {
    syncSubscription {
      success
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
      error
    }
  }
`;

export async function syncSubscription(): Promise<SubscriptionInfo | null> {
  const result = await graphqlRequest<{
    syncSubscription: {
      success: boolean;
      subscription: SubscriptionInfo | null;
      error: string | null;
    };
  }>(SYNC_SUBSCRIPTION_MUTATION);

  if (!result.syncSubscription.success || !result.syncSubscription.subscription) {
    throw new Error(result.syncSubscription.error || "Failed to sync subscription");
  }

  return result.syncSubscription.subscription;
}

