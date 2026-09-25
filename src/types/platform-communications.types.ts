/**
 * Platform communications health (P64 Communications C7) — mirrors the
 * backend `platform-communications-health.contract.ts` field for field.
 *
 * Aggregates only. The backend deliberately returns no recipient address,
 * no subject and no message body, and the suppression list returns HASHED
 * addresses — so nothing here can render a real person's email.
 */

export interface CommunicationsOutboxHealth {
  readonly byState: Readonly<Record<string, number>>;
  /**
   * Age of the oldest message that is already DUE and still waiting.
   * `null` means nothing is waiting, which is the healthy reading. A
   * number that grows between visits means the dispatcher has stopped
   * draining the queue — the one failure that otherwise looks exactly
   * like a quiet week.
   */
  readonly oldestPendingSeconds: number | null;
  readonly overdue: number;
  readonly failed: number;
}

export interface CommunicationsDeliveryHealth {
  readonly byStatus: Readonly<Record<string, number>>;
  readonly byProvider: Readonly<Record<string, number>>;
  readonly failureRatio: number;
}

export interface CommunicationsProviderQuota {
  readonly provider: string;
  /** Position in the fallback chain; 0 is the primary. */
  readonly position: number;
  readonly dailyUsed: number;
  readonly dailyLimit: number | null;
  readonly monthlyUsed: number;
  readonly monthlyLimit: number | null;
}

export interface PlatformCommunicationsHealth {
  readonly windowDays: number;
  readonly outbox: CommunicationsOutboxHealth;
  readonly deliveries: CommunicationsDeliveryHealth;
  readonly suppressions: {
    readonly total: number;
    readonly byReason: Readonly<Record<string, number>>;
  };
  readonly digests: Readonly<Record<string, number>>;
  readonly providers: readonly CommunicationsProviderQuota[];
  readonly generatedAt: string;
}

export interface CommunicationSuppressionRow {
  readonly id: string;
  /** SHA-256 of the canonical address. The address itself never leaves the server. */
  readonly emailHash: string;
  readonly reason: string;
  readonly source: string | null;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface CommunicationSuppressionPage {
  readonly items: readonly CommunicationSuppressionRow[];
  readonly nextCursor: string | null;
}
