/**
 * B0-SEC-13 — privacy requests (data deletion / data export). Mirrors the
 * backend contracts in `atlas-backend/src/privacy-requests/dto/privacy-request.contract.ts`.
 */
export type PrivacyRequestType = 'deletion' | 'export';
export type PrivacyRequestStatus =
  'submitted' | 'in_progress' | 'completed' | 'rejected';

/** The requester's own view of a request. */
export interface MyPrivacyRequest {
  readonly id: string;
  readonly type: PrivacyRequestType;
  readonly status: PrivacyRequestStatus;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly resolutionNote: string | null;
  readonly exportAvailableUntil: string | null;
  readonly canDownload: boolean;
}

/** A row in the Platform Owner queue. */
export interface PlatformPrivacyRequest {
  readonly id: string;
  readonly type: PrivacyRequestType;
  readonly status: PrivacyRequestStatus;
  readonly userId: string | null;
  readonly requesterName: string;
  readonly requesterEmail: string;
  readonly academyId: string | null;
  readonly academyName: string | null;
  readonly resolutionNote: string | null;
  readonly handledByUserId: string | null;
  readonly exportAvailableUntil: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PrivacyRequestChallenge {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
  readonly maskedEmail: string;
}

export interface PlatformPrivacyRequestListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: PrivacyRequestStatus;
  readonly type?: PrivacyRequestType;
}

export const OPEN_PRIVACY_REQUEST_STATUSES: readonly PrivacyRequestStatus[] = [
  'submitted',
  'in_progress',
];
