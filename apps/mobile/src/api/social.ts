import { graphqlRequest } from "./graphql";

export interface SocialAccount {
  id: string;
  platform: string;
  platformUserId: string;
  linkedAt: string | null;
  createdAt: string;
}

const INSTAGRAM_ACCOUNT_QUERY = `
  query InstagramAccount {
    instagramAccount {
      id
      platform
      platformUserId
      linkedAt
      createdAt
    }
  }
`;

const LINKED_SOCIAL_ACCOUNTS_QUERY = `
  query LinkedSocialAccounts {
    linkedSocialAccounts {
      id
      platform
      platformUserId
      linkedAt
      createdAt
    }
  }
`;

const LINK_INSTAGRAM_ACCOUNT_MUTATION = `
  mutation LinkInstagramAccount($verificationCode: String!) {
    linkInstagramAccount(verificationCode: $verificationCode) {
      success
      verificationCode
      error
    }
  }
`;

const GENERATE_INSTAGRAM_VERIFICATION_CODE_MUTATION = `
  mutation GenerateInstagramVerificationCode {
    generateInstagramVerificationCode {
      success
      verificationCode
      error
    }
  }
`;

const UNLINK_INSTAGRAM_ACCOUNT_MUTATION = `
  mutation UnlinkInstagramAccount {
    unlinkInstagramAccount {
      success
      error
    }
  }
`;

export async function getInstagramAccount(): Promise<SocialAccount | null> {
  const result = await graphqlRequest<{ instagramAccount: SocialAccount | null }>(
    INSTAGRAM_ACCOUNT_QUERY
  );
  return result.instagramAccount;
}

export async function getLinkedSocialAccounts(): Promise<SocialAccount[]> {
  const result = await graphqlRequest<{ linkedSocialAccounts: SocialAccount[] }>(
    LINKED_SOCIAL_ACCOUNTS_QUERY
  );
  return result.linkedSocialAccounts;
}

export async function linkInstagramAccount(
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  const result = await graphqlRequest<{
    linkInstagramAccount: { success: boolean; verificationCode: string; error: string | null };
  }>(LINK_INSTAGRAM_ACCOUNT_MUTATION, {
    verificationCode
  });

  return {
    success: result.linkInstagramAccount.success,
    error: result.linkInstagramAccount.error || undefined
  };
}

export async function generateInstagramVerificationCode(): Promise<{ success: boolean; verificationCode?: string; error?: string }> {
  const result = await graphqlRequest<{
    generateInstagramVerificationCode: { success: boolean; verificationCode: string; error: string | null };
  }>(GENERATE_INSTAGRAM_VERIFICATION_CODE_MUTATION);

  return {
    success: result.generateInstagramVerificationCode.success,
    verificationCode: result.generateInstagramVerificationCode.verificationCode || undefined,
    error: result.generateInstagramVerificationCode.error || undefined
  };
}

export async function unlinkInstagramAccount(): Promise<{ success: boolean; error?: string }> {
  const result = await graphqlRequest<{
    unlinkInstagramAccount: { success: boolean; error: string | null };
  }>(UNLINK_INSTAGRAM_ACCOUNT_MUTATION);

  return {
    success: result.unlinkInstagramAccount.success,
    error: result.unlinkInstagramAccount.error || undefined
  };
}

