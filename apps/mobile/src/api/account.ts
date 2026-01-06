import { graphqlRequest } from "./graphql";

export interface PrivacyRequest {
  id: string;
  type: "DATA_EXPORT" | "DATA_DELETION";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

const REQUEST_DATA_EXPORT_MUTATION = `
  mutation RequestDataExport($note: String) {
    requestDataExport(note: $note) {
      success
      error
      request {
        id
        type
        status
        note
        createdAt
        updatedAt
      }
    }
  }
`;

const REQUEST_DATA_DELETION_MUTATION = `
  mutation RequestDataDeletion($note: String) {
    requestDataDeletion(note: $note) {
      success
      error
      request {
        id
        type
        status
        note
        createdAt
        updatedAt
      }
    }
  }
`;

const DELETE_ACCOUNT_MUTATION = `
  mutation DeleteAccount {
    deleteAccount {
      success
      error
    }
  }
`;

export async function requestDataExport(note?: string): Promise<{ success: boolean; request?: PrivacyRequest; error?: string }> {
  const result = await graphqlRequest<{
    requestDataExport: { success: boolean; error: string | null; request: PrivacyRequest | null };
  }>(REQUEST_DATA_EXPORT_MUTATION, { note });

  return {
    success: result.requestDataExport.success,
    request: result.requestDataExport.request ?? undefined,
    error: result.requestDataExport.error ?? undefined
  };
}

export async function requestDataDeletion(note?: string): Promise<{ success: boolean; request?: PrivacyRequest; error?: string }> {
  const result = await graphqlRequest<{
    requestDataDeletion: { success: boolean; error: string | null; request: PrivacyRequest | null };
  }>(REQUEST_DATA_DELETION_MUTATION, { note });

  return {
    success: result.requestDataDeletion.success,
    request: result.requestDataDeletion.request ?? undefined,
    error: result.requestDataDeletion.error ?? undefined
  };
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const result = await graphqlRequest<{
    deleteAccount: { success: boolean; error: string | null };
  }>(DELETE_ACCOUNT_MUTATION);

  return {
    success: result.deleteAccount.success,
    error: result.deleteAccount.error ?? undefined
  };
}





