// Basic TypeScript types mirroring the OpenAPI schemas we need

export type Currency = 'CHF' | 'USD' | 'EUR' | 'CNY' | 'GBP';

export type ClaimStatus =
  | 'UNKNOWN'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PAID'
  | 'FINISHED'
  | 'REJECTED'
  | 'PAYMENT_FAILED'
  | 'WITHDRAW';

export interface PayoutInfo {
  bankName?: string;
  accountNumber?: string; // loosely typed as string due to varying formats
  iban?: string;
  swift?: string;
  routingNumber?: string;
  bankAddress?: string;
}

export interface PhotoResponse {
  id: string;
  bucket?: string;
  key: string;
  uploadedAt?: string; // ISO string
}

export interface TagResponse {
  id: string;
  label: string;
  color?: string;
}

export interface ClaimRequest {
  title: string;
  description?: string;
  status?: ClaimStatus;
  photoIds?: string[];
  tagIds?: string[];
  amount: number;
  currency?: Currency;
  payout: PayoutInfo;
  recipient?: string;
  expenseAt: string; // ISO
  password?: string; // optional password to protect claim
}

export interface ClaimPatchRequest {
  // Note: server limits what anonymous users can change; include password for authorization
  title?: string; // admin only per API description
  description?: string; // admin only
  status?: ClaimStatus;
  amount?: number; // admin only
  currency?: Currency; // admin only
  payout?: PayoutInfo; // admin only
  recipient?: string; // admin only
  expenseAt?: string; // ISO, admin only
  password?: string; // password for anonymous updates
}

export interface ClaimResponse {
  id: string;
  title: string;
  description?: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: Currency;
  recipient?: string;
  expenseAt: string;
  payout: PayoutInfo;
  photos?: PhotoResponse[];
  tags?: TagResponse[];
}

export interface PhotoUploadRequest {
  bucket?: string;
  key?: string; // if omitted, server picks UUID
  contentType: string;
  expiresInSeconds?: number;
}

export interface PhotoCreateRequest {
  bucket?: string;
  key: string; // uploaded object key
}

export interface PresignUploadResponse {
  // The API marks this as generic object; these fields are common shape
  url: string;
  // Some backends return multi-valued headers, e.g. { Host: ["localhost:9000"] }
  headers?: Record<string, string | string[]>;
  bucket?: string;
  key?: string;
  expiresAt?: string;
}

export interface PresignDownloadResponse {
  url: string;
  expiresAt?: string;
}
