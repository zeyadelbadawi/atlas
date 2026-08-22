/**
 * usePlatformPaymentDetail hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformPaymentKeys } from '@services/query';
import { platformPaymentService } from '../services/PlatformPaymentService';
import type { Payment } from '@types';
import type { ApiError } from '@api';

export function usePlatformPaymentDetail(paymentId: string) {
  return useApiQuery<Payment, ApiError>({
    queryKey: platformPaymentKeys.detail(paymentId),
    queryFn: () => platformPaymentService.getPayment(paymentId),
    enabled: !!paymentId,
  });
}
