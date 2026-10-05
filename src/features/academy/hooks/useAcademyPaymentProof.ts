/**
 * The learner's proof for one payment, as an object URL the review sheet can
 * show inline (image) or open (PDF). Fetched through the authenticated API —
 * the file lives in a private bucket and is never linked by URL — and the
 * object URL is revoked when the sheet moves to another payment or closes.
 */
import { useEffect, useState } from 'react';
import { academyPaymentsService } from '../services/AcademyPaymentsService';

export interface PaymentProofObject {
  readonly url: string | null;
  readonly isLoading: boolean;
  readonly error: boolean;
  readonly reload: () => void;
}

export function useAcademyPaymentProof(
  academyId: string,
  paymentId: string | undefined,
  enabled: boolean
): PaymentProofObject {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !paymentId || !academyId) return;
    let cancelled = false;
    let created: string | null = null;
    setIsLoading(true);
    setError(false);
    setUrl(null);
    academyPaymentsService
      .getProofFile(academyId, paymentId)
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [academyId, paymentId, enabled, attempt]);

  return { url, isLoading, error, reload: () => setAttempt((n) => n + 1) };
}
